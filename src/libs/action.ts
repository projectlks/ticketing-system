"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";
import { getCurrentUser } from "@/app/main/tickets/action";
import { NextResponse } from "next/server";

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



// app/api/tickets/count/route.ts


export async function getTicketCount() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  let where = {};

  if (user.role === "SUPER_ADMIN" || user.role === "ADMIN") {
    // အကုန်ပြမယ်
    where = {};
  } else if (user.role === "AGENT") {
    // Agent assigned tickets only
    where = { assignedToId: user.id };
  } else if (user.role === "REQUESTER") {
    // Requester tickets only
    where = { requesterId: user.id }; // categoryId -> requesterId
  }

  // Only count non-archived tickets
  const count = await prisma.ticket.count({
    where: {
      ...where,
      isArchived: false,

      // priority: "HIGH", // "အရေးအတွက်" tickets ကို HIGh priority ဆို assume
    },
  });

  return count;
}