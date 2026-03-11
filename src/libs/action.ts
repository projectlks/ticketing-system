"use server"

import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";
import { BasicUserData } from "@/context/UserProfileContext";
import { ZabbixProblem } from "@/types/zabbix";
import { CommentWithRelations } from "@/components/CommentSection";
import z from "zod";

const CommentSchema = z.object({
  content: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  ticketId: z.string(),
  parentId: z.string().nullable().optional(),
});

type ActionResult<T> = {
  data?: T;
  error?: string;
};

const toErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
};


export async function uploadComment(input: {
  content?: string | null;
  imageUrl?: string | null;
  ticketId: string;
  parentId?: string
}): Promise<{ success: boolean; data?: CommentWithRelations; error?: string }> {
  const parsed = CommentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid comment payload",
    };
  }

  const { content, imageUrl, ticketId, parentId } = parsed.data;

  const currentUserId = await getCurrentUserId();
  if (!currentUserId) {
    return { success: false, error: "No logged-in user found" };
  }

  try {
    const comment = await prisma.comment.create({
      data: {
        content: content || "",
        imageUrl: imageUrl || "",
        ticketId,
        parentId: parentId || null,
        commenterId: currentUserId,
      },
      include: {
        commenter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        replies: true,
      },
    });

    return {
      success: true,
      data: comment,
    };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error, "Failed to upload comment"),
    };
  }
}

interface LikeCommentParams {
  commentId: string;
}



export async function likeComment({ commentId }: LikeCommentParams) {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "User not authenticated" };

  try {
    const existingLike = await prisma.commentLike.findUnique({
      where: { commentId_userId: { commentId, userId } },
    });

    if (existingLike) {
      await prisma.commentLike.delete({ where: { commentId_userId: { commentId, userId } } });
      return { liked: false };
    }

    await prisma.commentLike.create({ data: { commentId, userId } });
    return { liked: true };
  } catch (error) {
    return { error: toErrorMessage(error, "Failed to update like") };
  }
}

export async function getCommentWithTicketId(ticketId: string): Promise<CommentWithRelations[]> {
  // Get all comments for the ticket including commenter and likes
  const allComments = await prisma.comment.findMany({
    where: { ticketId },
    include: {
      commenter: { select: { id: true, name: true, email: true } },
      likes: { include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'desc' } }, // include users who liked
    },
    orderBy: { createdAt: "asc" },
  });

  // Group comments by parentId for quick lookup
  const commentMap = new Map<string | null, CommentWithRelations[]>();
  for (const comment of allComments) {
    const parentList = commentMap.get(comment.parentId ?? null) || [];
    parentList.push({ ...comment, replies: [] });
    commentMap.set(comment.parentId ?? null, parentList);
  }

  // Recursively attach replies
  function attachReplies(parentId: string | null): CommentWithRelations[] {
    return (commentMap.get(parentId) || []).map(comment => ({
      ...comment,
      replies: attachReplies(comment.id),
    }));
  }

  // Return only top-level comments with nested replies
  return attachReplies(null);
}


export async function getCurrentUserId(): Promise<string | undefined> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return undefined;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isArchived: true },
  });

  if (!user || user.isArchived) return undefined;
  return userId;
}





// Slim version (only basic info)
export async function getBasicUserData(): Promise<ActionResult<BasicUserData>> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "No logged-in user found" };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, profileUrl: true }
  });

  if (!user) return { error: "User not found" };

  return { data: user };
}

export async function getCurrentUserData(): Promise<ActionResult<unknown>> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "No logged-in user found" };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      creator: true,
      updater: true,

      // Departments
      createdDepartments: true,
      // managedDepartments: true,
      updatedDepartments: true,

      // Job positions

      // Categories

      // Tickets
      requestTickets: {
        include: {
          category: true,
          // subcategory: true,
          department: true,
          assignedTo: true,
        },
      },
      assignedTickets: {
        include: {
          category: true,
          // subcategory: true,
          department: true,
          requester: true,
        },
      },

      // Comments & likes
      comments: { include: { ticket: true } },
      likes: { include: { comment: { include: { ticket: true } } } },

      // Audits
      audits: { include: { user: true } },
    },
  });

  if (!user) return { error: "User not found" };

  return { data: user };
}

// ======================
// Zabbix JSON-RPC helper
// ======================
async function zabbixRequest<T>(
  method: string,
  params: Record<string, unknown>,
  token: string,
  url: string
): Promise<ActionResult<T>> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method,
        params,
        auth: token,
        id: 1,
      }),
    });

    const data = await res.json();
    if (data?.error) {
      return {
        error: `${data.error.message}: ${data.error.data}`,
      };
    }

    return { data: data.result as T };
  } catch (error) {
    return { error: toErrorMessage(error, "Zabbix request failed") };
  }
}

// ======================
// Check event status in Zabbix
// ======================
export async function checkEventStatus(
  eventId: string,
): Promise<ActionResult<{ exists: boolean; status?: string }>> {
  const url = process.env.ZABBIX_URL;
  const token = process.env.ZABBIX_API_TOKEN;

  if (!url || !token) {
    return { error: "ZABBIX_URL or ZABBIX_API_TOKEN is not configured" };
  }

  const problemsResult = await zabbixRequest<ZabbixProblem[]>(
    "problem.get",
    {
      output: ["eventid", "r_eventid"],
      eventids: [eventId],
    },
    token,
    url,
  );

  if (problemsResult.error || !problemsResult.data) {
    return { error: problemsResult.error ?? "Failed to fetch event status" };
  }

  const problems = problemsResult.data;
  if (!problems || problems.length === 0) {
    return { data: { exists: false, status: "Resolved / Not active" } };
  }

  return { data: { exists: true, status: problems[0].r_eventid } };
}
