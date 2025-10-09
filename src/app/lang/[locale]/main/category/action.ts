"use server";

import { prisma } from "@/libs/prisma";
import z from "zod";
import { getCurrentUserId } from "@/libs/action";
import { CategoryWithRelations } from "./page";

// ===== Validation =====
const CategoryFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  departmentId: z.string(),
});

export async function getDepartments() {
  return prisma.department.findMany({
    where: { isArchived: false },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
};

// ===== Create Category =====
export async function createCategory(
  formData: FormData,
  // subCategories: { id?: string; title: string }[]
): Promise<{ success: boolean; data: CategoryWithRelations }> {
  const raw = { name: formData.get("name"), departmentId: formData.get("departmentId") };
  const parsed = CategoryFormSchema.parse(raw);

  const creatorId = await getCurrentUserId();
  if (!creatorId) throw new Error("User must be logged in to create a category");

  const data = await prisma.category.create({
    data: {
      name: parsed.name,
      departmentId: parsed.departmentId as string,
      creatorId,

    },
    include: {
      creator: { select: { name: true, email: true } },
      updater: { select: { name: true, email: true } },
      // subcategories: true,
    },
  });

  return { success: true, data };
}

// ===== Get Single Category =====
export async function getCategory(id: string): Promise<CategoryWithRelations | null> {
  return prisma.category.findUnique({
    where: { id },
    include: {
      creator: { select: { name: true, email: true } },
      updater: { select: { name: true, email: true } },
      tickets: { select: { id: true, title: true, status: true } },
      department: { select: { id: true, name: true } },
      subcategories: { select: { id: true, name: true } },
    },
  });
}

// ===== Get All Parent Categories Only =====
export async function getAllCategories(
  page: number = 1,
  searchQuery: string = ""
): Promise<{ data: CategoryWithRelations[]; total: number }> {
  const take = 10;
  const skip = (page - 1) * take;
  const trimmedQuery = searchQuery.trim();

  const where = {
    isArchived: false,
    parentId: null, // only parent categories
    ...(trimmedQuery && {
      OR: [{ name: { contains: trimmedQuery, mode: "insensitive" as const } }],
    }),
  };

  const total = await prisma.category.count({ where });
  const data = await prisma.category.findMany({
    where,
    skip,
    take,
    orderBy: { createdAt: "desc" },
    include: {
      creator: { select: { name: true, email: true } },
      updater: { select: { name: true, email: true } },
      department: { select: { id: true, name: true } },
    },
  });

  return { data, total };
}

// ===== Soft Delete Category =====
export async function deleteCategory(id: string) {
  const updaterId = await getCurrentUserId();
  return prisma.category.update({
    where: { id },
    data: { isArchived: true, updaterId },
  });
}

// ===== Update Category =====
export async function updateCategory(
  formData: FormData,
  id: string,
  // subCategories: { id?: string; title: string }[] = []
): Promise<{ success: boolean; data: CategoryWithRelations }> {
  const { name, departmentId } = CategoryFormSchema.parse({ name: formData.get("name"), departmentId: formData.get("departmentId") });
  const updaterId = await getCurrentUserId();
  if (!updaterId) throw new Error("No logged-in user found");

  const existingCategory = await prisma.category.findUnique({
    where: { id },
    include: { subcategories: true },
  });
  if (!existingCategory) throw new Error("Category not found");

  // Update main category
  const data = await prisma.category.update({
    where: { id },
    data: { name, departmentId, updaterId },
    include: {
      creator: { select: { name: true, email: true } },
      updater: { select: { name: true, email: true } },
      tickets: { select: { id: true, title: true, status: true } },
    },
  });

  // Audit log
  if (existingCategory.name !== name) {
    await prisma.audit.create({
      data: {
        entity: "Category",
        entityId: id,
        field: "name",
        oldValue: existingCategory.name,
        newValue: name,
        userId: updaterId,
      },
    });
  }

  // Sync subcategories
  // for (const sub of subCategories) {
  //   const trimmedTitle = sub.title.trim();
  //   if (!trimmedTitle) continue;

  //   if (sub.id) {
  //     // Update existing
  //     const existingSub = existingCategory.subcategories.find(s => s.id === sub.id);
  //     if (existingSub && existingSub.name !== trimmedTitle) {
  //       await prisma.category.update({
  //         where: { id: sub.id },
  //         data: { name: trimmedTitle, updaterId },
  //       });
  //     }
  //   } else {
  //     // Create new subcategory
  //     await prisma.category.create({
  //       data: { name: trimmedTitle, creatorId: updaterId, parentId: id },
  //     });
  //   }
  // }

  return { success: true, data };
}

// ===== Get Audit Logs =====
export async function getCategoryAuditLogs(id: string) {
  return prisma.audit.findMany({
    where: { entity: "Category", entityId: id },
    orderBy: { changedAt: "desc" },
    include: { user: { select: { name: true, email: true } } },
  });
}
