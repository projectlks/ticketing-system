"use server";

import { getCurrentUserId } from "@/libs/action";
import { prisma } from "@/libs/prisma";
import {
  getOrSetCache,
  invalidateCacheByPrefixes,
} from "@/libs/redis-cache";
import { requireSuperAdminAndEmail } from "@/libs/admin-guard";
import z from "zod";

import {
  HELPDESK_CACHE_PREFIXES,
  HELPDESK_CACHE_TTL_SECONDS,
  helpdeskRedisKeys,
} from "../cache/redis-keys";
import type { DepartmentTicketStats } from "./page";

const DepartmentFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Department name must be at least 2 characters")
    .max(80, "Department name must be at most 80 characters"),
  description: z
    .string()
    .trim()
    .max(300, "Description must be at most 300 characters")
    .optional(),
  email: z.string().trim().email("Invalid email address"),
  contact: z
    .string()
    .trim()
    .max(60, "Contact must be at most 60 characters")
    .optional(),
});

type DepartmentActionResult<T> = {
  data?: T;
  error?: string;
};

const toErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
};

export async function createDepartment(
  formData: FormData,
): Promise<DepartmentActionResult<{ id: string }>> {
  const raw = {
    name: formData.get("name")?.toString() ?? "",
    description: formData.get("description")?.toString() ?? "",
    email: formData.get("email")?.toString() ?? "",
    contact: formData.get("contact")?.toString() ?? "",
  };

  const parsed = DepartmentFormSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid department data.",
    };
  }
  const normalizedName = parsed.data.name.trim();
  const normalizedDescription = parsed.data.description?.trim() || null;
  const normalizedContact = parsed.data.contact?.trim() || null;
  const normalizedEmail = parsed.data.email.trim();

  const existing = await prisma.department.findFirst({
    where: { name: { equals: normalizedName, mode: "insensitive" } },
    select: { id: true, isArchived: true },
  });
  if (existing?.isArchived) {
    return { error: "Department name exists but is archived." };
  }
  if (existing) return { error: "Department Name already exists" };

  const userId = await getCurrentUserId();
  if (!userId) {
    return { error: "Unauthorized" };
  }

  try {
    const department = await prisma.department.create({
      data: {
        name: normalizedName,
        description: normalizedDescription,
        contact: normalizedContact,
        email: normalizedEmail,
        creatorId: userId,
      },
    });

    await prisma.audit.create({
      data: {
        entity: "Department",
        entityId: department.id,
        userId,
        action: "CREATE",
      },
    });

    await invalidateCacheByPrefixes([
      HELPDESK_CACHE_PREFIXES.departments,
      HELPDESK_CACHE_PREFIXES.overview,
      HELPDESK_CACHE_PREFIXES.analysis,
    ]);

    return { data: { id: department.id } };
  } catch (error) {
    return { error: toErrorMessage(error, "Failed to create department.") };
  }
}

export async function deleteDepartment(
  departmentId: string,
): Promise<DepartmentActionResult<{ id: string; action: "archived" }>> {
  if (!departmentId) {
    return { error: "Department id is required." };
  }

  const adminResult = await requireSuperAdminAndEmail();
  if ("error" in adminResult) {
    return { error: adminResult.error };
  }

  const department = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { id: true, name: true, isArchived: true },
  });

  if (!department) {
    return { error: "Department not found." };
  }

  try {
    const usersCount = await prisma.user.count({ where: { departmentId } });
    if (usersCount > 0) {
      return {
        error: "Department has users. Move users to another department first.",
      };
    }

    const categories = await prisma.category.findMany({
      where: { departmentId },
      select: { id: true, name: true, isArchived: true },
    });
    const categoryIds = categories.map((category) => category.id);
    const categoryNameMap = new Map(
      categories.map((category) => [category.id, category.name]),
    );

    const ticketsToUpdate = await prisma.ticket.findMany({
      where: {
        OR: [
          { departmentId },
          ...(categoryIds.length > 0 ? [{ categoryId: { in: categoryIds } }] : []),
        ],
      },
      select: { id: true, departmentId: true, categoryId: true },
    });

    if (categoryIds.length > 0) {
      await prisma.ticket.updateMany({
        where: { categoryId: { in: categoryIds } },
        data: { categoryId: null },
      });
    }

    await prisma.ticket.updateMany({
      where: { departmentId },
      data: { departmentId: null },
    });

    if (ticketsToUpdate.length > 0) {
      const ticketAuditData = ticketsToUpdate
        .map((ticket) => {
          const changes: Array<{ field: string; oldValue: string; newValue: string }> = [];

          if (ticket.departmentId === departmentId) {
            changes.push({
              field: "departmentId",
              oldValue: department.name,
              newValue: "UNASSIGNED",
            });
          }

          if (ticket.categoryId && categoryNameMap.has(ticket.categoryId)) {
            changes.push({
              field: "categoryId",
              oldValue: categoryNameMap.get(ticket.categoryId) ?? ticket.categoryId,
              newValue: "UNASSIGNED",
            });
          }

          if (changes.length === 0) return null;

          return {
            entity: "Ticket",
            entityId: ticket.id,
            userId: adminResult.data.id,
            action: "UPDATE" as const,
            changes,
          };
        })
        .filter(
          (
            entry,
          ): entry is {
            entity: string;
            entityId: string;
            userId: string;
            action: "UPDATE";
            changes: Array<{ field: string; oldValue: string; newValue: string }>;
          } => Boolean(entry),
        );

      if (ticketAuditData.length > 0) {
        await prisma.audit.createMany({ data: ticketAuditData });
      }
    }

    if (categoryIds.length > 0) {
      await prisma.category.updateMany({
        where: { id: { in: categoryIds }, isArchived: false },
        data: { isArchived: true },
      });

      const categoriesToAudit = categories.filter((category) => !category.isArchived);
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
    }

    if (!department.isArchived) {
      await prisma.department.update({
        where: { id: departmentId },
        data: { isArchived: true, updaterId: adminResult.data.id },
      });

      await prisma.audit.create({
        data: {
          entity: "Department",
          entityId: departmentId,
          userId: adminResult.data.id,
          action: "UPDATE",
          changes: [
            {
              field: "isArchived",
              oldValue: "false",
              newValue: "true",
            },
          ],
        },
      });
    }

    await invalidateCacheByPrefixes([
      HELPDESK_CACHE_PREFIXES.departments,
      HELPDESK_CACHE_PREFIXES.categories,
      HELPDESK_CACHE_PREFIXES.tickets,
      HELPDESK_CACHE_PREFIXES.overview,
      HELPDESK_CACHE_PREFIXES.analysis,
    ]);

    return { data: { id: departmentId, action: "archived" } };
  } catch (error) {
    return { error: toErrorMessage(error, "Failed to archive department.") };
  }
}

export async function getDepartmentNames(): Promise<{ name: string; id: string }[]> {
  const cacheKey = helpdeskRedisKeys.departmentNames();

  return getOrSetCache(
    cacheKey,
    HELPDESK_CACHE_TTL_SECONDS.departmentNames,
    async () =>
      prisma.department.findMany({
        where: { isArchived: false },
        select: {
          name: true,
          id: true,
        },
        orderBy: { name: "asc" },
      }),
  );
}

export async function getDepartments(): Promise<DepartmentTicketStats[]> {
  const cacheKey = helpdeskRedisKeys.departments();

  return getOrSetCache(
    cacheKey,
    HELPDESK_CACHE_TTL_SECONDS.departments,
    async () => {
      const departments = await prisma.department.findMany({
        where: { isArchived: false },
        orderBy: [{ createdAt: "desc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          contact: true,
          email: true,
        },
      });

      const results: DepartmentTicketStats[] = [];

      for (const dept of departments) {
        // Department overview count တွေမှာ archived ticket မပါစေဖို့ shared base filter သတ်မှတ်ထားပါတယ်။
        const baseWhere = { departmentId: dept.id, isArchived: false };

        const [newCount, open, closed, urgent, unassigned] = await Promise.all([
          prisma.ticket.count({
            where: { ...baseWhere, status: "NEW" },
          }),

          prisma.ticket.count({
            // OPEN + IN_PROGRESS ကို active open work အဖြစ်ယူထားပါတယ်။
            where: { ...baseWhere, status: { in: ["OPEN", "IN_PROGRESS"] } },
          }),

          prisma.ticket.count({
            // CLOSED-like status တွေကို closed summary ထဲပေါင်းထားပါတယ်။
            where: {
              ...baseWhere,
              status: { in: ["CLOSED", "RESOLVED", "CANCELED"] },
            },
          }),

          prisma.ticket.count({
            // Urgent ကို CRITICAL priority + active status နဲ့တွက်ထားပါတယ်။
            where: {
              ...baseWhere,
              priority: "CRITICAL",
              status: { in: ["OPEN", "IN_PROGRESS", "NEW"] },
            },
          }),

          prisma.ticket.count({
            where: { ...baseWhere, assignedToId: null },
          }),
        ]);

        results.push({
          id: dept.id,
          name: dept.name,
          contact: dept.contact,
          email: dept.email,
          count: {
            new: newCount,
            open,
            closed,
            urgent,
            unassigned,
          },
        });
      }

      return results;
    },
  );
}


