"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";

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

export async function getJobPositionsByDepartment(departmentId: string): Promise<{ id: string; title: string }[]> {
  return prisma.jobPosition.findMany({
    where: { departmentId },
    select: { id: true, title: true },
    orderBy: { createdAt: "desc" }, // newest first
  });
}

// ====================
// Category Utilities
// ====================

export async function getAllCategoryIdAndName(): Promise<{ id: string; name: string }[]> {
  return prisma.category.findMany({
    where: { isArchived: false },
    select: { id: true, name: true },
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
