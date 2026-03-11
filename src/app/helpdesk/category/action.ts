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

type CategoryActionResult<T> = {
  data?: T;
  error?: string;
};

const toErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
};

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

export async function createCategory(
  data: CategoryFormValues,
): Promise<CategoryActionResult<CategoryEntity>> {
  const parsed = CategoryFormSchema.safeParse(data);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid category data.",
    };
  }

  // Department တူတူထဲ name တူ category မဖြစ်အောင် create မတိုင်ခင် check လုပ်ထားပါတယ်။
  const existingCategory = await prisma.category.findFirst({
    where: {
      departmentId: parsed.data.departmentId,
      name: {
        equals: parsed.data.name,
        mode: "insensitive",
      },
    },
    select: { id: true },
  });

  if (existingCategory) {
    return {
      error: "Category name already exists in this department.",
    };
  }

  try {
    const created = await prisma.category.create({
      data: parsed.data,
    });

    await invalidateCacheByPrefixes([
      HELPDESK_CACHE_PREFIXES.categories,
      HELPDESK_CACHE_PREFIXES.tickets,
    ]);

    return { data: { ...created, departmentName: "" } };
  } catch (error) {
    return { error: toErrorMessage(error, "Failed to create category.") };
  }
}

export async function updateCategory(
  id: string,
  data: CategoryFormValues,
): Promise<CategoryActionResult<CategoryEntity>> {
  if (!id) {
    return { error: "Category id is required." };
  }

  const parsed = CategoryFormSchema.safeParse(data);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid category data.",
    };
  }

  // Update လုပ်တဲ့အချိန်မှာလည်း current row ကိုချန်ပြီး duplicate name ကိုစစ်ပေးထားပါတယ်။
  const duplicatedCategory = await prisma.category.findFirst({
    where: {
      departmentId: parsed.data.departmentId,
      name: {
        equals: parsed.data.name,
        mode: "insensitive",
      },
      NOT: { id },
    },
    select: { id: true },
  });

  if (duplicatedCategory) {
    return {
      error: "Category name already exists in this department.",
    };
  }

  try {
    const updated = await prisma.category.update({
      where: { id },
      data: parsed.data,
    });

    await invalidateCacheByPrefixes([
      HELPDESK_CACHE_PREFIXES.categories,
      HELPDESK_CACHE_PREFIXES.tickets,
      HELPDESK_CACHE_PREFIXES.analysis,
    ]);

    return { data: { ...updated, departmentName: "" } };
  } catch (error) {
    return { error: toErrorMessage(error, "Failed to update category.") };
  }
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
