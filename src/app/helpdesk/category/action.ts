"use server";

import { prisma } from "@/libs/prisma";
import {
  getOrSetCache,
  invalidateCacheByPrefixes,
} from "@/libs/redis-cache";

import {
  HELPDESK_CACHE_PREFIXES,
  HELPDESK_CACHE_TTL_SECONDS,
  helpdeskRedisKeys,
} from "../cache/redis-keys";
import {
  CategoryFormSchema,
  type CategoryEntity,
  type CategoryFormValues,
} from "./types";

export async function getCategories(): Promise<CategoryEntity[]> {
  const cacheKey = helpdeskRedisKeys.categories();

  return getOrSetCache(
    cacheKey,
    HELPDESK_CACHE_TTL_SECONDS.categories,
    async () => {
      const categories = await prisma.category.findMany({
        include: {
          department: {
            select: { name: true },
          },
        },
        orderBy: [{ name: "asc" }, { createdAt: "desc" }],
      });

      return categories.map((category) => ({
        id: category.id,
        name: category.name,
        departmentId: category.departmentId,
        departmentName: category.department?.name ?? "",
      }));
    },
  );
}

export async function createCategory(data: CategoryFormValues) {
  const parsed = CategoryFormSchema.parse(data);

  // Department တူတူထဲ name တူ category မဖြစ်အောင် create မတိုင်ခင် check လုပ်ထားပါတယ်။
  const existingCategory = await prisma.category.findFirst({
    where: {
      departmentId: parsed.departmentId,
      name: {
        equals: parsed.name,
        mode: "insensitive",
      },
    },
    select: { id: true },
  });

  if (existingCategory) {
    throw new Error("Category name already exists in this department.");
  }

  const created = await prisma.category.create({
    data: parsed,
  });

  await invalidateCacheByPrefixes([
    HELPDESK_CACHE_PREFIXES.categories,
    HELPDESK_CACHE_PREFIXES.tickets,
  ]);

  return created;
}

export async function updateCategory(id: string, data: CategoryFormValues) {
  if (!id) {
    throw new Error("Category id is required.");
  }

  const parsed = CategoryFormSchema.parse(data);

  // Update လုပ်တဲ့အချိန်မှာလည်း current row ကိုချန်ပြီး duplicate name ကိုစစ်ပေးထားပါတယ်။
  const duplicatedCategory = await prisma.category.findFirst({
    where: {
      departmentId: parsed.departmentId,
      name: {
        equals: parsed.name,
        mode: "insensitive",
      },
      NOT: { id },
    },
    select: { id: true },
  });

  if (duplicatedCategory) {
    throw new Error("Category name already exists in this department.");
  }

  const updated = await prisma.category.update({
    where: { id },
    data: parsed,
  });

  await invalidateCacheByPrefixes([
    HELPDESK_CACHE_PREFIXES.categories,
    HELPDESK_CACHE_PREFIXES.tickets,
    HELPDESK_CACHE_PREFIXES.analysis,
  ]);

  return updated;
}

export async function getCategoriesNames(): Promise<
  { name: string; id: string; departmentId: string }[]
> {
  const cacheKey = helpdeskRedisKeys.categoryNames();

  return getOrSetCache(
    cacheKey,
    HELPDESK_CACHE_TTL_SECONDS.categoryNames,
    async () =>
      prisma.category.findMany({
        select: {
          name: true,
          id: true,
          departmentId: true,
        },
        orderBy: { name: "asc" },
      }),
  );
}
