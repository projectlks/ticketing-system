"use server";

import { prisma } from "@/libs/prisma";
import z from "zod";
import { getCurrentUserId } from "@/libs/action";
import { AuditChange } from "@/libs/action";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { Prisma, Status } from "@prisma/client";
import { TicketWithRelations } from "./page";
// import { CommentWithRelations } from "./view/[id]/TicketView";


const TicketSchema = z.object({
  title: z.string().min(1, "Title cannot be empty"),
  description: z.string().min(1, "Title cannot be empty"),
  categoryId: z.string(),
  subcategoryId: z.string(),
  departmentId: z.string(),
  assignedToId: z.string().nullable().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  // images: z.array(z.string()).optional()
});

const CommentSchema = z.object({
  content: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  ticketId: z.string(),
  parentId: z.string().nullable().optional(),
});


async function generateTicketId(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear(); // 2025
  const month = (now.getMonth() + 1).toString().padStart(2, '0'); // 08

  // ယခုလအတွင်းရှိ ticket အရေအတွက် ရှာမယ် (year + month တူတဲ့ ticket များ)
  const count = await prisma.ticket.count({
    where: {
      createdAt: {
        gte: new Date(year, now.getMonth(), 1), // ဒီလ ၁ ရက် ၀းစ
        lt: new Date(year, now.getMonth() + 1, 1), // နောက်လ ၁ ရက် ၀းစ (exclusive)
      },
    },
  });

  // count က ယခင် ticket အရေအတွက်ဖြစ်ပြီး၊ ဒီ ticket အတွက် ၁ ပေါင်းမယ်
  const ticketNumber = (count + 1).toString().padStart(3, '0'); // 001, 002, ...

  const ticketId = `REQ-${year}-${month}-${ticketNumber}`;
  return ticketId;
}

export async function createTicket(
  formData: FormData
): Promise<{ success: boolean; data: TicketWithRelations }> {
  const raw = {
    title: formData.get("title"),
    description: formData.get("description"),
    departmentId: formData.get("departmentId"),
    categoryId: formData.get("categoryId"),
    subcategoryId: formData.get("subcategoryId"),
    priority: formData.get("priority"),

  };

  // Parse images from JSON string
  const imagesJson = formData.get("images") as string | null;
  const images = imagesJson ? JSON.parse(imagesJson) as string[] : [];



  const data = TicketSchema.parse(raw);
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) throw new Error("No logged-in user found");

  const ticketId = await generateTicketId();

  const ticket = await prisma.ticket.create({
    data: {
      ...data,
      ticketId,
      createdAt: new Date(),
      updatedAt: new Date(),
      requesterId: currentUserId,
    },
  });

  // Insert ticket images
  if (images.length) {
    await prisma.ticketImage.createMany({
      data: images.map((url) => ({
        ticketId: ticket.id,
        url,
      })),
    });
  }

  const createdData = await prisma.ticket.findUnique({
    where: { id: ticket.id },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      requester: { select: { id: true, name: true, email: true } },
      images: true,
      views: true, // ✅ DB မှာ array
    },
  });

  if (!createdData) throw new Error("Ticket creation failed");

  // map views array → viewed boolean
  const ticketWithViewed: TicketWithRelations = {
    ...createdData,
    viewed: createdData.views.some(v => v.userId === currentUserId), // creator ရှိမရှိစစ်
  };

  return { success: true, data: ticketWithViewed };
}

// Get Single Ticket
export async function getTicket(id: string) {


  // await prisma.TicketImage


  return await prisma.ticket.findUnique({
    where: { id },
    include: {
      category: true,
      department: true,
      requester: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      images: true, // <-- fetches all related images
    },
  });
}





export async function getCurrentUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) return null;

  // Fetch user with role and id from database
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true, email: true, name: true },
  });

  return user;
}
export async function getAllTickets(
  page = 1,
  searchQuery = "",
  filters: { key: string; value: string }[] = [],
  viewedFilter?: "SEEN" | "UNSEEN"
) {
  const take = 10;
  const skip = (page - 1) * take;
  const trimmedQuery = searchQuery.trim();

  const prismaFilters: Prisma.TicketWhereInput = {};

  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  // Apply filters (status, priority, assigned)
  filters.forEach(f => {
    if (f.key === "Assigned") {
      prismaFilters.assignedToId = f.value === "Assigned" ? { not: null } : null;
    } else if (f.key === "Status") {
      const statusMap: Record<string, Prisma.TicketWhereInput["status"]> = {
        Open: "OPEN",
        "In Progress": "IN_PROGRESS",
        Resolved: "RESOLVED",
        Closed: "CLOSED",
      };
      prismaFilters.status = statusMap[f.value] || undefined;
    } else if (f.key === "Priority") {
      const priorityMap: Record<string, Prisma.TicketWhereInput["priority"]> = {
        Low: "LOW",
        Medium: "MEDIUM",
        High: "HIGH",
        Urgent: "URGENT",
      };
      prismaFilters.priority = priorityMap[f.value] || undefined;
    }
  });

  // Role-based filters
  if (user.role === "REQUESTER") prismaFilters.requesterId = user.id;
  else if (user.role === "AGENT") prismaFilters.assignedToId = user.id;

  // Seen/Unseen filter
  if (viewedFilter === "SEEN") prismaFilters.views = { some: { userId: user.id } };
  if (viewedFilter === "UNSEEN") prismaFilters.views = { none: { userId: user.id } };

  const where: Prisma.TicketWhereInput = {
    ...prismaFilters,
    ...(trimmedQuery && {
      OR: [
        { title: { contains: trimmedQuery, mode: Prisma.QueryMode.insensitive } },
        { description: { contains: trimmedQuery, mode: Prisma.QueryMode.insensitive } },
      ],
    }),
  };

  const total = await prisma.ticket.count({ where });
  const rawData = await prisma.ticket.findMany({
    where,
    skip,
    take,
    orderBy: { createdAt: "desc" },
    include: {
      category: true,
      department: true,
      requester: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      views: true,
    },
  });

  const data = rawData.map(ticket => ({
    ...ticket,
    viewed: ticket.views.some(v => v.userId === user.id),
  }));

  return { data, total };
}


export async function updateTicket(
  formData: FormData,
  id: string
): Promise<{ success: boolean; data: TicketWithRelations }> {
  // 1. ticket အချက်အလက်တွေကို parse လုပ်မယ်
  const updateDataRaw = {
    title: formData.get("title"),
    description: formData.get("description"),
    departmentId: formData.get("departmentId"),
    categoryId: formData.get("categoryId"),
    subcategoryId: formData.get("subcategoryId"),
    priority: formData.get("priority"),
  };
  const updateData = TicketSchema.parse(updateDataRaw);

  const updaterId = await getCurrentUserId();
  if (!updaterId) throw new Error("No logged-in user found");

  // 2. ရှိပြီးသား ticket data ကို database မှာရှာမယ်
  const current = await prisma.ticket.findUniqueOrThrow({ where: { id } });

  // 3. ပြောင်းလဲမှုတွေကို audit log အတွက် စစ်မယ်
  const changes: AuditChange[] = Object.entries(updateData).flatMap(([field, newVal]) => {
    const oldVal = (current as Record<string, unknown>)[field];
    if (oldVal?.toString() !== newVal?.toString()) {
      return [{
        field,
        oldValue: oldVal?.toString() ?? "",
        newValue: newVal?.toString() ?? "",
      }];
    }
    return [];
  });

  // 4. formData ထဲက images ကို parse လုပ်မယ်  
  // formData.get("existingImageIds") မှာ ကျန်ရှိနေတဲ့ image တွေရဲ့ id တွေ JSON string အဖြစ် ရှိတယ်လို့ယူထားတယ်
  const existingImageIds = JSON.parse(formData.get("existingImageIds") as string || "[]") as string[];

  // formData.get("newImages") မှာ အသစ် upload လုပ်ထားတဲ့ images URL တွေ JSON string အဖြစ် ရှိတယ်လို့ယူထားတယ်
  const newImageUrls = JSON.parse(formData.get("newImages") as string || "[]") as string[];

  // 5. DB ထဲက ticketImage table မှာ အခု ticket နဲ့ ဆက်နွယ်ပြီး ကျန်ရှိတဲ့ image id တွေကို ရှာထုတ်မယ်
  const imagesInDb = await prisma.ticketImage.findMany({
    where: { ticketId: id },
    select: { id: true },
  });
  const imagesInDbIds = imagesInDb.map(img => img.id);

  // 6. existingImageIds ထဲ မပါတဲ့ DB ရဲ့ image ids ကို filter လုပ်ပြီး ဖျက်ရန် id များကို ရှာမယ်
  const idsToDelete = imagesInDbIds.filter(dbId => !existingImageIds.includes(dbId));

  if (idsToDelete.length > 0) {
    await prisma.ticketImage.deleteMany({
      where: {
        id: { in: idsToDelete },
      }
    });
  }

  // 7. အသစ် upload လုပ်ထားတဲ့ images URL တွေကို ticketImage table ထဲသို့ထည့်မယ်
  if (newImageUrls.length) {
    const newImagesData = newImageUrls.map(url => ({ ticketId: id, url }));
    await prisma.ticketImage.createMany({ data: newImagesData });
  }

  // 8. ticket အချက်အလက်တွေကို update လုပ်မယ်
  await prisma.ticket.update({
    where: { id },
    data: { ...updateData, updatedAt: new Date() },
  });

  // 9. audit log ကို ထည့်သွင်းမယ်
  if (changes.length) {
    await prisma.audit.createMany({
      data: changes.map((c) => ({
        entity: "Ticket",
        entityId: id,
        field: c.field,
        oldValue: c.oldValue,
        newValue: c.newValue,
        userId: updaterId,
      })),
    });
  }

  // 10. update ပြီးတဲ့ ticket ကို relations တွေနဲ့ ပြန်ရှာပြီး return ပြန်မယ်
  const updatedTicketRaw = await prisma.ticket.findFirst({
    where: { id },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      requester: { select: { id: true, name: true, email: true } },
      images: true,
      views: true,
    },
  });

  if (!updatedTicketRaw) {
    throw new Error('Ticket not found after update');
  }

  // map views array → viewed boolean
  const updatedTicket: TicketWithRelations = {
    ...updatedTicketRaw,
    viewed: updatedTicketRaw.views.some(v => v.userId === updaterId),
  };

  return { success: true, data: updatedTicket };
}





// Delete Ticket (soft delete example)
export async function deleteTicket(id: string) {
  // Optional: get logged-in user to track who deleted
  // const session = await getServerSession(authOptions);

  return await prisma.ticket.update({
    where: { id },
    data: {
      isArchived: true, // add this boolean to your Ticket model if not present
      updatedAt: new Date(),
      // updaterId: session?.user?.id, // if you add updater relation
    },
  });
}

// Get audit logs for a ticket
export async function getTicketAuditLogs(ticketId: string) {
  return await prisma.audit.findMany({
    where: {
      entity: "Ticket",
      entityId: ticketId,
    },
    orderBy: { changedAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
    },
  });
}



// lib/tickets.ts

export async function getTicketDetail(id: string) {
  return await prisma.ticket.findUnique({
    where: { id },
    select: {
      id: true,
      ticketId: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      createdAt: true,
      updatedAt: true,
      assignedToId: true,
      category: {
        select: { id: true, name: true },
      },
      subcategory: {
        select: { id: true, name: true },

      },
      department: {
        select: { id: true, name: true },
      },
      requester: {
        select: { id: true, name: true, email: true },
      },
      assignedTo: {
        select: { id: true, name: true, email: true },
      },
      images: {
        select: { id: true, url: true },
      },
    },
  });
}



export async function ticketAssign(
  ticketId: string,
  assignedToId: string | null
): Promise<void> {
  const updaterId = await getCurrentUserId();
  if (!updaterId) throw new Error("No logged-in user found");

  // ရှိပြီးသား ticket data ကို ရှာမယ်
  const currentTicket = await prisma.ticket.findUniqueOrThrow({
    where: { id: ticketId },
    include: {
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  // ပြောင်းလဲမှုရှိမရှိ စစ်မယ်
  const oldAssignedTo = currentTicket.assignedTo;
  if (oldAssignedTo?.id === assignedToId) {
    // ပြောင်းမှုမရှိရင် update လုပ်စရာမလို
    return;
  }

  // Update ticket assignedToId
  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      assignedToId: assignedToId,
      status: "IN_PROGRESS",  // assign လုပ်တိုင်း status ပြောင်းချင်ရင်
      updatedAt: new Date(),
    },
  });

  // အသစ် assignedTo info ရှာဖို့
  const newAssignedTo = assignedToId
    ? await prisma.user.findUnique({
      where: { id: assignedToId },
      select: { name: true, email: true },
    })
    : null;

  // oldValue, newValue ကို "name (email)" format ပြောင်း
  const oldValue = oldAssignedTo
    ? `${oldAssignedTo.name} ( ${oldAssignedTo.email} )`
    : "";

  const newValue = newAssignedTo
    ? `${newAssignedTo.name} (${newAssignedTo.email} )`
    : "";

  // Audit log ထည့်မယ်
  await prisma.audit.create({
    data: {
      entity: "Ticket",
      entityId: ticketId,
      field: "assignedToId",
      oldValue,
      newValue,
      userId: updaterId,
      changedAt: new Date(),
    },
  });
}


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



type CommentWithRelations = Prisma.CommentGetPayload<{
  include: {
    commenter: {
      select: { id: true; name: true; email: true }
    };
    replies: true;
  };
}>;

export async function getCommentWithTicketId(ticketId: string): Promise<CommentWithRelations[]> {
  // Get all comments for the ticket including commenter and likes
  const allComments = await prisma.comment.findMany({
    where: { ticketId },
    include: {
      commenter: { select: { id: true, name: true, email: true } },
      likes: { include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'desc' } }, // include users who liked
    },
    orderBy: { createdAt: "desc" },
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

// action.ts
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

export async function ticketStatusUpdate(
  ticketId: string,
  newStatus: Status // ✅ type-safe enum
): Promise<void> {
  const updaterId = await getCurrentUserId();
  if (!updaterId) throw new Error("No logged-in user found");

  // Fetch current ticket
  const currentTicket = await prisma.ticket.findUniqueOrThrow({
    where: { id: ticketId },
    select: {
      status: true,
    },
  });

  // Skip if no change
  if (currentTicket.status === newStatus) {
    return;
  }

  // Update status
  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status: newStatus, // ✅ enum-safe
      updatedAt: new Date(),
    },
  });

  // Audit log
  await prisma.audit.create({
    data: {
      entity: "Ticket",
      entityId: ticketId,
      field: "status",
      oldValue: currentTicket.status,
      newValue: newStatus,
      userId: updaterId,
      changedAt: new Date(),
    },
  });
}



export async function markTicketAsViewed(ticketId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  await prisma.ticketView.upsert({
    where: {
      ticketId_userId: {
        ticketId,
        userId: user.id,
      },
    },
    update: {}, // already viewed => nothing to update
    create: {
      ticketId,
      userId: user.id,
    },
  });
}