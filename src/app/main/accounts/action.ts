"use server";

import { prisma } from "@/libs/prisma";
import z from "zod";
import bcrypt from "bcrypt";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { Prisma } from "@prisma/client";
import { UserWithRelations } from "./page"; // ✅ imported type from Page
import { AuditChange, getCurrentUserId } from "@/libs/action";

// ===== Validation Schemas =====
const FormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["REQUESTER", "AGENT", "ADMIN"]),
  department: z.string(),
  jobPositionId: z.string()
});

const FormSchemaUpdate = FormSchema.omit({
  password: true,
});



// ===== Create Account =====
export async function createAccount(
  formData: FormData
): Promise<{ success: boolean; data: UserWithRelations }> {
  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    department: formData.get("department"),
   jobPositionId: formData.get("job_position")?.toString() || undefined

  };

  const { name, email, password, role, department, jobPositionId } = FormSchema.parse(raw);

  // Check if user exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error("User already exists");
  }

  // Hash password and get creator ID
  const hashedPassword = await bcrypt.hash(password, 10);
  const creatorId = await getCurrentUserId();

  // Create user
  await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role,
      department,
      jobPositionId: jobPositionId,
      creatorId: creatorId,
    },
  });

  // Fetch with relations
  const data = await prisma.user.findUniqueOrThrow({
    where: { email },
    include: {
      creator: { select: { name: true, email: true } },
      updater: { select: { name: true, email: true } },
    },
  });

  return { success: true, data };
}

// ===== Get Single Account =====
export async function getAccount(id: string) {
  return await prisma.user.findUnique({
    where: { id },
    include: {
      creator: { select: { name: true, email: true } },
      updater: { select: { name: true, email: true } },
      assignedTickets: { select: { id: true, title: true, status: true, priority: true } }, // tickets assigned to this user
      jobPosition: { select: { id: true, title: true } }, // <-- include job position
    },
  });
}

// ===== Get All Accounts =====
export async function getAllAccounts(
  page: number = 1,
  searchQuery: string = ""
) {
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
            mode: Prisma.QueryMode.insensitive,
          },
        },
        {
          email: {
            contains: trimmedQuery,
            mode: Prisma.QueryMode.insensitive,
          },
        },
      ],
    }),
  };

  const total = await prisma.user.count({ where });

  const data = await prisma.user.findMany({
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

// ===== Delete Account (Soft Delete) =====
export async function deleteAccount(id: string) {
  const session = await getServerSession(authOptions);

  return await prisma.user.update({
    where: { id },
    data: {
      isArchived: true,
      updaterId: session?.user?.id,
    },
  });
}

// ===== Update Account =====
export async function updateAccount(
  formData: FormData,
  id: string
): Promise<{ success: boolean; data: UserWithRelations }> {
  const updateDataRaw = {
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    department: formData.get("department"),
    jobPositionId: formData.get("job_position")?.toString() || undefined

  };

  const updateData = FormSchemaUpdate.parse(updateDataRaw);

  try {
    const updaterId = await getCurrentUserId();
    if (!updaterId) {
      throw new Error("No logged-in user found for updateAccount");
    }

    const current = await prisma.user.findUniqueOrThrow({
      where: { id },
    });

    // Build audit change list
    const changes: AuditChange[] = Object.entries(updateData).flatMap(
      ([field, newVal]) => {
        const oldVal = (current as Record<string, unknown>)[field];
        if (oldVal?.toString() !== newVal?.toString()) {
          return [
            {
              field,
              oldValue: oldVal?.toString() ?? "",
              newValue: newVal?.toString() ?? "",
            },
          ];
        }
        return [];
      }
    );

    await prisma.user.update({
      where: { id },
      data: { ...updateData, updaterId },
    });

    if (changes.length > 0) {
      await prisma.audit.createMany({
        data: changes.map((c) => ({
          entity: "User",
          entityId: id,
          field: c.field,
          oldValue: c.oldValue,
          newValue: c.newValue,
          userId: updaterId,
        })),
      });
    }

    // Fetch with relations by id (safer than email)
    const data = await prisma.user.findUniqueOrThrow({
      where: { id }, // ✅ fixed
      include: {
        creator: { select: { name: true, email: true } },
        updater: { select: { name: true, email: true } },
      },
    });

    return { success: true, data };
  } catch (error) {
    console.error("Error updating account:", error);
    throw error;
  }
}




export async function getAccountAuditLogs(accountId: string) {
  return await prisma.audit.findMany({
    where: {
      entity: "User",
      entityId: accountId,
    },
    orderBy: { changedAt: "desc" },
    include: {
      user: { select: { name: true, email: true } }, // who made the change
    },
  });
}
