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

type UserActionResult<T> = {
  data?: T;
  error?: string;
};


async function getCurrentUserContext(): Promise<
  UserActionResult<{ id: string; role: Role }>
> {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) return { error: "Unauthorized" };

  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: { id: true, role: true },
  });

  if (!currentUser) {
    return { error: "Unauthorized" };
  }

  return { data: currentUser };
}

function ensureSuperAdminRolePermission(params: {
  actorRole: Role;
  nextRole: Role;
  previousRole?: Role;
}): string | null {
  const { actorRole, nextRole, previousRole } = params;
  const touchesSuperAdmin =
    nextRole === SUPER_ADMIN_ROLE || previousRole === SUPER_ADMIN_ROLE;

  if (touchesSuperAdmin && actorRole !== SUPER_ADMIN_ROLE) {
    return SUPER_ADMIN_ROLE_PERMISSION_ERROR;
  }

  return null;
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

function toUserMutationErrorMessage(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const target = getUniqueConstraintTarget(error);
    const fields = getDriverConstraintFields(error);

    if (target.includes("User_email_key") || fields.includes("email")) {
      return "User with this email already exists";
    }
  }

  if (error instanceof Error) return error.message;
  return "Failed to save user";
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
export async function createUser(
  formData: FormData,
): Promise<UserActionResult<null>> {
  const raw: CreateInput = {
    name: formData.get("name")?.toString() ?? "",
    email: formData.get("email")?.toString() ?? "",
    password: formData.get("password")?.toString() ?? "",
    department: formData.get("department")?.toString() ?? "",
    role: formData.get("role")?.toString() as CreateInput["role"],
  };

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid user data.",
    };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (existingUser) {
    return { error: "User with this email already exists" };
  }

  const department = await prisma.department.findUnique({
    where: { id: parsed.data.department },
  });

  if (!department) {
    return { error: "Selected department does not exist" };
  }

  const currentUserResult = await getCurrentUserContext();
  if (currentUserResult.error || !currentUserResult.data) {
    return { error: currentUserResult.error ?? "Unauthorized" };
  }
  const currentUser = currentUserResult.data;

  const permissionError = ensureSuperAdminRolePermission({
    actorRole: currentUser.role,
    nextRole: parsed.data.role,
  });
  if (permissionError) {
    return { error: permissionError };
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 10);

  try {
    await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: hashedPassword,
        departmentId: parsed.data.department,
        role: parsed.data.role,
        creatorId: currentUser.id,
      },
    });
  } catch (error) {
    return { error: toUserMutationErrorMessage(error) };
  }

  await invalidateCacheByPrefixes([
    HELPDESK_CACHE_PREFIXES.users,
    HELPDESK_CACHE_PREFIXES.tickets,
    HELPDESK_CACHE_PREFIXES.overview,
  ]);

  return { data: null };
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

export async function updateUser(
  formData: FormData,
): Promise<UserActionResult<unknown>> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = UpdateUserSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid user data.",
    };
  }

  const currentUserResult = await getCurrentUserContext();
  if (currentUserResult.error || !currentUserResult.data) {
    return { error: currentUserResult.error ?? "Unauthorized" };
  }
  const currentUser = currentUserResult.data;

  const oldUser = await prisma.user.findUnique({
    where: { id: parsed.data.id },
    include: { department: true },
  });
  if (!oldUser) return { error: "User not found" };

  const permissionError = ensureSuperAdminRolePermission({
    actorRole: currentUser.role,
    previousRole: oldUser.role,
    nextRole: parsed.data.role,
  });
  if (permissionError) {
    return { error: permissionError };
  }

  const updateData: {
    name: string;
    email: string;
    password?: string;
    role: (typeof ROLE_VALUES)[number];
    departmentId: string;
    updaterId: string;
  } = {
    name: parsed.data.name,
    email: parsed.data.email,
    role: parsed.data.role,
    departmentId: parsed.data.departmentId,
    updaterId: currentUser.id,
  };

  if (parsed.data.password) {
    updateData.password = await bcrypt.hash(parsed.data.password, 10);
  }

  let updated: Awaited<ReturnType<typeof prisma.user.update>>;
  try {
    updated = await prisma.user.update({
      where: { id: parsed.data.id },
      data: updateData,
      include: { department: true },
    });
  } catch (error) {
    return { error: toUserMutationErrorMessage(error) };
  }

  await invalidateCacheByPrefixes([
    HELPDESK_CACHE_PREFIXES.users,
    HELPDESK_CACHE_PREFIXES.tickets,
    HELPDESK_CACHE_PREFIXES.overview,
  ]);

  return { data: updated };
}

export async function getUserById(id: string): Promise<
  UserActionResult<{
    id: string;
    name: string;
    email: string;
    departmentId: string | null;
    role: Role;
  }>
> {
  if (!id) return { error: "User ID is required" };

  const user = await getOrSetCache(
    helpdeskRedisKeys.userById(id),
    HELPDESK_CACHE_TTL_SECONDS.userById,
    async () =>
      prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          departmentId: true,
          role: true,
        },
      }),
  );

  if (!user) return { error: "User not found" };
  return { data: user };
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
