"use server";

import { prisma } from "@/libs/prisma";
import {
  getOrSetCache,
  invalidateCacheByPrefixes,
} from "@/libs/redis-cache";
import { requireSuperAdminAndEmail } from "@/libs/admin-guard";

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
        where: { isArchived: false },
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
      isArchived: false,
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
      isArchived: false,
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

export async function deleteCategory(
  id: string,
): Promise<CategoryActionResult<{ id: string; action: "archived" }>> {
  if (!id) {
    return { error: "Category id is required." };
  }

  const adminResult = await requireSuperAdminAndEmail();
  if ("error" in adminResult) {
    return { error: adminResult.error };
  }

  const rootCategory = await prisma.category.findUnique({
    where: { id },
    select: { id: true, name: true, isArchived: true },
  });

  if (!rootCategory) {
    return { error: "Category not found." };
  }

  try {
    const categoriesToArchive: Array<{
      id: string;
      name: string;
      isArchived: boolean;
    }> = [rootCategory];
    let queue = [rootCategory.id];

    while (queue.length > 0) {
      const children = await prisma.category.findMany({
        where: { parentId: { in: queue } },
        select: { id: true, name: true, isArchived: true },
      });
      if (children.length === 0) break;
      categoriesToArchive.push(...children);
      queue = children.map((child) => child.id);
    }

    const categoryIds = categoriesToArchive.map((category) => category.id);
    const categoryNameMap = new Map(
      categoriesToArchive.map((category) => [category.id, category.name]),
    );

    const ticketsToUpdate = await prisma.ticket.findMany({
      where: { categoryId: { in: categoryIds } },
      select: { id: true, categoryId: true },
    });

    if (ticketsToUpdate.length > 0) {
      await prisma.ticket.updateMany({
        where: { categoryId: { in: categoryIds } },
        data: { categoryId: null },
      });

      const ticketAuditData = ticketsToUpdate.map((ticket) => ({
        entity: "Ticket",
        entityId: ticket.id,
        userId: adminResult.data.id,
        action: "UPDATE" as const,
        changes: [
          {
            field: "categoryId",
            oldValue: categoryNameMap.get(ticket.categoryId ?? "") ?? "",
            newValue: "UNASSIGNED",
          },
        ],
      }));

      await prisma.audit.createMany({ data: ticketAuditData });
    }

    await prisma.category.updateMany({
      where: { id: { in: categoryIds }, isArchived: false },
      data: { isArchived: true },
    });

    const categoriesToAudit = categoriesToArchive.filter(
      (category) => !category.isArchived,
    );
    if (categoriesToAudit.length > 0) {
      await prisma.audit.createMany({
        data: categoriesToAudit.map((category) => ({
          entity: "Category",
          entityId: category.id,
          userId: adminResult.data.id,
          action: "UPDATE" as const,
          changes: [
            {
              field: "isArchived",
              oldValue: "false",
              newValue: "true",
            },
          ],
        })),
      });
    }

    await invalidateCacheByPrefixes([
      HELPDESK_CACHE_PREFIXES.categories,
      HELPDESK_CACHE_PREFIXES.tickets,
      HELPDESK_CACHE_PREFIXES.analysis,
    ]);

    return { data: { id, action: "archived" } };
  } catch (error) {
    return { error: toErrorMessage(error, "Failed to archive category.") };
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
        where: { isArchived: false },
        select: {
          name: true,
          id: true,
          departmentId: true,
        },
        orderBy: { name: "asc" },
      }),
  );
}
