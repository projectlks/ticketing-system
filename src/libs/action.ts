"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";
import { getCurrentUser } from "@/app/main/tickets/action";




export async function heartbeat() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Find the active session(s) for this user
  const userSessions = await prisma.userSession.findMany({
    where: { userId: session.user.id },
  });

  const now = new Date();
  const extendMs = 1000 * 60 * 5; // 5 minutes

  for (const s of userSessions) {
    // only extend if still using
    const newExpires = new Date(Math.max(s.expiresAt.getTime(), now.getTime() + extendMs));
    await prisma.userSession.update({
      where: { id: s.id },
      data: {
        lastSeen: now,
        expiresAt: newExpires,
      },
    });
  }

  return new Response("OK");
}


export async function deleteUserSession(id: string) {
  await prisma.userSession.deleteMany({ where: { userId: id } });
}

// ====================
// User Utilities
// ====================

export async function getCurrentUserId(): Promise<string | undefined> {
  const session = await getServerSession(authOptions);
  return session?.user?.id;
}

export async function getUserIdsandEmail(): Promise<{ id: string; email: string; name: string }[]> {
  return prisma.user.findMany({
    where: { isArchived: false },
    select: { id: true, email: true, name: true },
    orderBy: { createdAt: "desc" }, // sorted by newest first
  });
}

export async function getUserIdsandEmailByDepeartmentId({ id }: { id: string }): Promise<{ id: string; email: string; name: string }[]> {
  return prisma.user.findMany({
    where: { isArchived: false, departmentId: id },
    select: { id: true, email: true, name: true },
    orderBy: { createdAt: "desc" }, // sorted by newest first
  });
}

// ====================
// Department Utilities
// ====================

export async function getAllDepartmentIdAndName(): Promise<{ id: string; name: string }[]> {
  return prisma.department.findMany({
    where: { isArchived: false },
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" }, // newest first
  });
}

export async function getJobPositionsByDepartment(departmentId: string): Promise<{ id: string; name: string }[]> {
  return prisma.jobPosition.findMany({
    where: { departmentId },
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" }, // newest first
  });
}

// ====================
// Category Utilities
// ====================
export async function getAllCategoryIdAndName(): Promise<{ id: string; name: string; subcategories: { id: string; name: string }[] }[]> {
  return prisma.category.findMany({
    where: { isArchived: false, parentId: null },
    select: {
      id: true,
      name: true,
      subcategories: { select: { id: true, name: true } }
    },
    orderBy: { createdAt: "desc" }, // newest first
  });
}


// ====================
// Audit Utilities
// ====================

export interface AuditChange {
  field: string;
  oldValue: string;
  newValue: string;
}




export async function getUnseenTicketCount() {
  const user = await getCurrentUser();
  if (!user) return 0;

  if (user.role === "SUPER_ADMIN" || user.role === "ADMIN") {
    // Admins → unseen tickets all
    return prisma.ticket.count({
      where: {
        isArchived: false,
        views: {
          none: {
            userId: user.id, // ဒီ user မကြည့်ရသေးရင်
          },
        },
      },
    });
  }

  if (user.role === "AGENT") {
    // Agents → only assigned tickets unseen
    return prisma.ticket.count({
      where: {
        isArchived: false,
        assignedToId: user.id,
        views: {
          none: {
            userId: user.id,
          },
        },
      },
    });
  }

  if (user.role === "REQUESTER") {
    // Requesters → unseen count မလို
    return 0;
  }

  return 0;
}



