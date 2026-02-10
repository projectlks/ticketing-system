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


export async function uploadComment(input: {
  content?: string | null;
  imageUrl?: string | null;
  ticketId: string;
  parentId?: string
}): Promise<{ success: boolean; data: CommentWithRelations }> {
  const { content, imageUrl, ticketId, parentId } = CommentSchema.parse(input);

  const currentUserId = await getCurrentUserId();
  if (!currentUserId) throw new Error("No logged-in user found");

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

      replies: true
    },
  });

  return {
    success: true,
    data: comment,
  };
}


interface LikeCommentParams {
  commentId: string;
}



export async function likeComment({ commentId }: LikeCommentParams) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("User not authenticated");

  const existingLike = await prisma.commentLike.findUnique({
    where: { commentId_userId: { commentId, userId } },
  });

  if (existingLike) {
    await prisma.commentLike.delete({ where: { commentId_userId: { commentId, userId } } });
    return { liked: false };
  } else {
    await prisma.commentLike.create({ data: { commentId, userId } });
    return { liked: true };
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
  return session?.user?.id;
}





// Slim version (only basic info)
export async function getBasicUserData(): Promise<BasicUserData> {
  const userId = await getCurrentUserId();
  // if (!userId) throw new Error("No logged-in user found");
  // if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, profileUrl: true }
  });

  if (!user) throw new Error("User not found");

  return user;
}


export async function getCurrentUserData() {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("No logged-in user found");

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

  if (!user) throw new Error("User not found");

  return user;
}



// ======================
// Zabbix JSON-RPC helper
// ======================
async function zabbixRequest<T>(
  method: string,
  params: Record<string, unknown>,
  token: string,
  url: string
): Promise<T> {
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
  if (data.error) throw new Error(`${data.error.message}: ${data.error.data}`);
  return data.result;
}

// ======================
// Check event status in Zabbix
// ======================
export async function checkEventStatus(eventId: string): Promise<{ exists: boolean; status?: string }> {
  const url = process.env.ZABBIX_URL!;
  const token = process.env.ZABBIX_API_TOKEN!;

  // Fetch active problems only
  const problems = await zabbixRequest<ZabbixProblem[]>(
    "problem.get",
    {
      output: ["eventid", "r_eventid"],
      eventids: [eventId],
    },
    token,
    url
  );

  if (!problems || problems.length === 0) {
    return { exists: false, status: "Resolved / Not active" };
  }

  return { exists: true, status: problems[0].r_eventid };
}
