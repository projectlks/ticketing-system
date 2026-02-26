"use server";

import { Role } from "@/generated/prisma/client";
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

/* -------------------------------
   ZOD VALIDATION SCHEMAS
-------------------------------- */
const UserFormSchema = z.object({
  id: z.string(),
  name: z.string().min(5, "Name must be at least 5 letters"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  department: z.string(),
  role: z.enum(["REQUESTER", "AGENT", "ADMIN", "SUPER_ADMIN"]),
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

  const currentUserId = await getCurrentUserId();
  if (!currentUserId) throw new Error("Unauthorized");

  const hashedPassword = await bcrypt.hash(parsed.password, 10);

  await prisma.user.create({
    data: {
      name: parsed.name,
      email: parsed.email,
      password: hashedPassword,
      departmentId: parsed.department,
      role: parsed.role,
      creatorId: currentUserId,
    },
  });

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
  role: z.enum(["REQUESTER", "AGENT", "ADMIN", "SUPER_ADMIN"]),
});

export async function updateUser(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = UpdateUserSchema.parse(raw);

  const currentUserId = await getCurrentUserId();
  if (!currentUserId) throw new Error("Unauthorized");

  const oldUser = await prisma.user.findUnique({
    where: { id: parsed.id },
    include: { department: true },
  });
  if (!oldUser) throw new Error("User not found");

  const updateData: {
    name: string;
    email: string;
    password?: string;
    role: "REQUESTER" | "AGENT" | "ADMIN" | "SUPER_ADMIN";
    departmentId: string;
    updaterId: string;
  } = {
    name: parsed.name,
    email: parsed.email,
    role: parsed.role,
    departmentId: parsed.departmentId,
    updaterId: currentUserId,
  };

  if (parsed.password) {
    updateData.password = await bcrypt.hash(parsed.password, 10);
  }

  const updated = await prisma.user.update({
    where: { id: parsed.id },
    data: updateData,
    include: { department: true },
  });

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
