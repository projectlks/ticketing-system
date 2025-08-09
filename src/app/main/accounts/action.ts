"use server";

import { prisma } from "@/libs/prisma";
import z from "zod";
import bcrypt from "bcrypt";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { Prisma } from "@prisma/client";
import { UserWithRelations } from "./page"; // ✅ imported type from Page
import { getCurrentUserId } from "@/libs/action";

// ===== Validation Schemas =====
const FormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["CUSTOMER", "AGENT", "ADMIN", "SUPER_ADMIN"]),
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
  };

  const { name, email, password, role } = FormSchema.parse(raw);

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
      createdId: creatorId,
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
      updatedId: session?.user?.id,
    },
  });
}

// ===== Update Account =====
export async function updateAccount(formData: FormData, id: string) : Promise<{ success: boolean; data: UserWithRelations }> {
  const { name, email, role } = FormSchemaUpdate.parse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
  });

  try {
    const updaterId = await getCurrentUserId();

     await prisma.user.update({
      where: { id },
      data: { name, email, role, updatedId: updaterId },
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
  } catch (error) {
    console.error("Error updating account:", error);
    throw error;
  }
}
