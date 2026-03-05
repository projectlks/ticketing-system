"use server";

import { Prisma, Role } from "@/generated/prisma/client";
import { getCurrentUserId } from "@/libs/action";
import { prisma } from "@/libs/prisma";
import {
  getOrSetCache,
  invalidateCacheByPrefixes,
} from "@/libs/redis-cache";
import bcrypt from "bcryptjs";
import { z } from "zod";

import {
  HELPDESK_CACHE_PREFIXES,
  HELPDESK_CACHE_TTL_SECONDS,
  helpdeskRedisKeys,
} from "../cache/redis-keys";
import type { TicketStats } from "./types";

const ROLE_VALUES = ["LEVEL_1", "LEVEL_2", "LEVEL_3", "SUPER_ADMIN"] as const;
const SUPER_ADMIN_ROLE: Role = "SUPER_ADMIN";
const SUPER_ADMIN_ROLE_PERMISSION_ERROR =
  "Only SUPER_ADMIN can assign or manage SUPER_ADMIN role.";

async function getCurrentUserContext(): Promise<{ id: string; role: Role }> {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) throw new Error("Unauthorized");

  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: { id: true, role: true },
  });

  if (!currentUser) {
    throw new Error("Unauthorized");
  }

  return currentUser;
}

function ensureSuperAdminRolePermission(params: {
  actorRole: Role;
  nextRole: Role;
  previousRole?: Role;
}) {
  const { actorRole, nextRole, previousRole } = params;
  const touchesSuperAdmin =
    nextRole === SUPER_ADMIN_ROLE || previousRole === SUPER_ADMIN_ROLE;

  if (touchesSuperAdmin && actorRole !== SUPER_ADMIN_ROLE) {
    throw new Error(SUPER_ADMIN_ROLE_PERMISSION_ERROR);
  }
}

function getUniqueConstraintTarget(error: Prisma.PrismaClientKnownRequestError) {
  const target = error.meta?.target;
  if (Array.isArray(target)) return target.join(",");
  if (typeof target === "string") return target;
  return JSON.stringify(target ?? "");
}

function getDriverConstraintFields(error: Prisma.PrismaClientKnownRequestError) {
  const meta = error.meta as
    | {
        driverAdapterError?: {
          cause?: {
            constraint?: { fields?: string[] };
          };
        };
      }
    | undefined;

  return meta?.driverAdapterError?.cause?.constraint?.fields ?? [];
}

function toUserMutationError(error: unknown): Error {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const target = getUniqueConstraintTarget(error);
    const fields = getDriverConstraintFields(error);

    if (target.includes("User_email_key") || fields.includes("email")) {
      return new Error("User with this email already exists");
    }
  }

  if (error instanceof Error) return error;
  return new Error("Failed to save user");
}

/* -------------------------------
   ZOD VALIDATION SCHEMAS
-------------------------------- */
const UserFormSchema = z.object({
  id: z.string(),
  name: z.string().min(5, "Name must be at least 5 letters"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  department: z.string(),
  role: z.enum(ROLE_VALUES),
});

const createSchema = UserFormSchema.omit({ id: true });
type CreateInput = z.infer<typeof createSchema>;

/* -------------------------------
          CREATE USER
-------------------------------- */
export async function createUser(formData: FormData): Promise<void> {
  const raw: CreateInput = {
    name: formData.get("name")?.toString() ?? "",
    email: formData.get("email")?.toString() ?? "",
    password: formData.get("password")?.toString() ?? "",
    department: formData.get("department")?.toString() ?? "",
    role: formData.get("role")?.toString() as CreateInput["role"],
  };

  const parsed = createSchema.parse(raw);

  const existingUser = await prisma.user.findUnique({
    where: { email: parsed.email },
  });

  if (existingUser) throw new Error("User with this email already exists");

  const department = await prisma.department.findUnique({
    where: { id: parsed.department },
  });

  if (!department) throw new Error("Selected department does not exist");

  const currentUser = await getCurrentUserContext();

  ensureSuperAdminRolePermission({
    actorRole: currentUser.role,
    nextRole: parsed.role,
  });

  const hashedPassword = await bcrypt.hash(parsed.password, 10);

  try {
    await prisma.user.create({
      data: {
        name: parsed.name,
        email: parsed.email,
        password: hashedPassword,
        departmentId: parsed.department,
        role: parsed.role,
        creatorId: currentUser.id,
      },
    });
  } catch (error) {
    throw toUserMutationError(error);
  }

  await invalidateCacheByPrefixes([
    HELPDESK_CACHE_PREFIXES.users,
    HELPDESK_CACHE_PREFIXES.tickets,
    HELPDESK_CACHE_PREFIXES.overview,
  ]);
}

/* -------------------------------
          UPDATE USER
-------------------------------- */
const UpdateUserSchema = z.object({
  id: z.string(),
  name: z.string().min(5),
  email: z.string().email(),
  password: z.string().min(8).optional(),
  departmentId: z.string(),
  role: z.enum(ROLE_VALUES),
});

export async function updateUser(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = UpdateUserSchema.parse(raw);

  const currentUser = await getCurrentUserContext();

  const oldUser = await prisma.user.findUnique({
    where: { id: parsed.id },
    include: { department: true },
  });
  if (!oldUser) throw new Error("User not found");

  ensureSuperAdminRolePermission({
    actorRole: currentUser.role,
    previousRole: oldUser.role,
    nextRole: parsed.role,
  });

  const updateData: {
    name: string;
    email: string;
    password?: string;
    role: (typeof ROLE_VALUES)[number];
    departmentId: string;
    updaterId: string;
  } = {
    name: parsed.name,
    email: parsed.email,
    role: parsed.role,
    departmentId: parsed.departmentId,
    updaterId: currentUser.id,
  };

  if (parsed.password) {
    updateData.password = await bcrypt.hash(parsed.password, 10);
  }

  const updated = await (async () => {
    try {
      return await prisma.user.update({
        where: { id: parsed.id },
        data: updateData,
        include: { department: true },
      });
    } catch (error) {
      throw toUserMutationError(error);
    }
  })();

  await invalidateCacheByPrefixes([
    HELPDESK_CACHE_PREFIXES.users,
    HELPDESK_CACHE_PREFIXES.tickets,
    HELPDESK_CACHE_PREFIXES.overview,
  ]);

  return updated;
}

export async function getUserById(id: string): Promise<{
  id: string;
  name: string;
  email: string;
  departmentId: string | null;
  role: Role;
}> {
  if (!id) throw new Error("User ID is required");

  return getOrSetCache(
    helpdeskRedisKeys.userById(id),
    HELPDESK_CACHE_TTL_SECONDS.userById,
    async () => {
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          departmentId: true,
          role: true,
        },
      });

      if (!user) throw new Error("User not found");
      return user;
    },
  );
}

export async function getUserToAssign(): Promise<
  { id: string; name: string; email: string; departmentId: string }[]
> {
  const cacheKey = helpdeskRedisKeys.usersToAssign();

  return getOrSetCache(
    cacheKey,
    HELPDESK_CACHE_TTL_SECONDS.userAssign,
    async () =>
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          departmentId: true,
        },
        orderBy: { name: "asc" },
      }),
  );
}

export async function getUsers(): Promise<TicketStats[]> {
  const cacheKey = helpdeskRedisKeys.users();

  return getOrSetCache(
    cacheKey,
    HELPDESK_CACHE_TTL_SECONDS.users,
    async () => {
      const users = await prisma.user.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      // User တစ်ယောက်စီအတွက် count query တွေကို parallel run လုပ်ထားလို့ list ကြီးလာချိန် latency လျော့ပါတယ်။
      return Promise.all(
        users.map(async (user) => {
          const [
            newAssigned,
            openAssigned,
            inProgressAssigned,
            closedAssigned,
            newCreated,
            openCreated,
            inProgressCreated,
            closedCreated,
          ] = await Promise.all([
            prisma.ticket.count({
              where: { assignedToId: user.id, status: "NEW", isArchived: false },
            }),
            prisma.ticket.count({
              where: { assignedToId: user.id, status: "OPEN", isArchived: false },
            }),
            prisma.ticket.count({
              where: {
                assignedToId: user.id,
                status: "IN_PROGRESS",
                isArchived: false,
              },
            }),
            prisma.ticket.count({
              where: {
                assignedToId: user.id,
                status: "CLOSED",
                isArchived: false,
              },
            }),
            prisma.ticket.count({
              where: { requesterId: user.id, status: "NEW", isArchived: false },
            }),
            prisma.ticket.count({
              where: { requesterId: user.id, status: "OPEN", isArchived: false },
            }),
            prisma.ticket.count({
              where: {
                requesterId: user.id,
                status: "IN_PROGRESS",
                isArchived: false,
              },
            }),
            prisma.ticket.count({
              where: {
                requesterId: user.id,
                status: "CLOSED",
                isArchived: false,
              },
            }),
          ]);

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            assigned: {
              new: newAssigned,
              open: openAssigned,
              inprogress: inProgressAssigned,
              closed: closedAssigned,
            },
            created: {
              new: newCreated,
              open: openCreated,
              inprogress: inProgressCreated,
              closed: closedCreated,
            },
          };
        }),
      );
    },
  );
}
