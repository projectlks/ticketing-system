"use server";

import { prisma } from "@/libs/prisma";
import z from "zod";
import { getCurrentUserId } from "@/libs/action";
import { CategoryWithRelations } from "./page";

// ===== Validation Schema =====
const CategoryFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

// ===== Create Category =====
export async function createCategory(
  formData: FormData
): Promise<{ success: boolean; data: CategoryWithRelations }> {
  const raw = {
    name: formData.get("name"),
  };

  const parsed = CategoryFormSchema.parse(raw);

  const creatorId = await getCurrentUserId();
  if (!creatorId) {
    throw new Error("User must be logged in to create a category");
  }

  const data = await prisma.category.create({
    data: {
      name: parsed.name,
      creatorId,
    },
    include: {
      creator: { select: { name: true, email: true } },
      updater: { select: { name: true, email: true } },
    },
  });

  return { success: true, data };
}

// ===== Get Single Category =====
export async function getCategory(id: string): Promise<CategoryWithRelations | null> {
  return await prisma.category.findUnique({
    where: { id },
    include: {
      creator: { select: { name: true, email: true } },
      updater: { select: { name: true, email: true } },
    },
  });
}

// ===== Get All Categories (Paged, with optional search) =====
export async function getAllCategories(
  page: number = 1,
  searchQuery: string = ""
): Promise<{ data: CategoryWithRelations[]; total: number }> {
  const take = 10;
  const skip = (page - 1) * take;
  const trimmedQuery = searchQuery.trim();

  const where = {
    isArchived: false,
    ...(trimmedQuery && {
      OR: [
        {
          name: {
            contains: trimmedQuery,
            mode: "insensitive" as const,
          },
        },
      ],
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
    },
  });

  return { data, total };
}

// ===== Soft Delete Category =====
export async function deleteCategory(id: string) {
  const updaterId = await getCurrentUserId();

  return await prisma.category.update({
    where: { id },
    data: {
      isArchived: true,
      updaterId,
    },
  });
}

// ===== Update Category =====
export async function updateCategory(
  formData: FormData,
  id: string
): Promise<{ success: boolean; data: CategoryWithRelations }> {
  const { name } = CategoryFormSchema.parse({
    name: formData.get("name"),
  });

  const updaterId = await getCurrentUserId();

  const data = await prisma.category.update({
    where: { id },
    data: {
      name,
      updaterId,
    },
    include: {
      creator: { select: { name: true, email: true } },
      updater: { select: { name: true, email: true } },
    },
  });

  return { success: true, data };
}
