"use server"

import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";


// ===== Utils =====
export async function getCurrentUserId() {
  const data = await getServerSession(authOptions);
  return data?.user?.id;
}


export async function getUserIdsandEmail(): Promise<{ id: string; email: string; name: string }[]> {
  const users = await prisma.user.findMany({
    where: { isArchived: false },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  return users;
}


export async function getAllDepartmentIdAndName() {
  const departments = await prisma.department.findMany({
    where: { isArchived: false },
    select: {
      id: true,
      name: true,
    },
  });

  return departments;
}

export async function getJobPositionsByDepartment(departmentId: string) {
  return prisma.jobPosition.findMany({
    where: { departmentId },
    select: { id: true, title: true },
  });
}

export async function getAllCategoryIdAndName() {
  const categories = await prisma.category.findMany({
    where: { isArchived: false },
    select: {
      id: true,
      name: true,
    },
  });

  return categories;
};

export interface AuditChange {
  field: string;
  oldValue: string;
  newValue: string;
}

