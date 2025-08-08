"use server";

import { prisma } from "@/libs/prisma";
import z from "zod";
import bcrypt from "bcrypt";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth"; // 👈 authOptions ကို import


const FormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["CUSTOMER", "AGENT", "ADMIN", "SUPER_ADMIN"]),
});





export async function getCurrentUserId() {
  const data = await getServerSession(authOptions);
  return data?.user?.id;
}


const FormSchemaUpdate = FormSchema.omit({
  password: true,
});

export async function createAccount(formData: FormData) {
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
    // Throw an error to be caught in the caller
    throw new Error("User already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);


  const creatorId = await getCurrentUserId();

  await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role,
      createdById: creatorId,
    },
  });

  return { success: true };
}


export async function getAccount(id: string) {
  return await prisma.user.findUnique({
    where: { id },
  });
}

// Fetch all non-archived user accounts from the database
import { Prisma } from "@prisma/client";

export async function getAllAccounts(page: number = 1, searchQuery: string = "") {
  const take = 10;
  const skip = (page - 1) * take;
  const trimmedQuery = searchQuery.trim();

  const where = {
    isArchived: false,
    ...(trimmedQuery && {
      OR: [
        { name: { contains: trimmedQuery, mode: Prisma.QueryMode.insensitive } },
        { email: { contains: trimmedQuery, mode: Prisma.QueryMode.insensitive } },
      ],
    }),
  };

  const total = await prisma.user.count({ where });

  const data = await prisma.user.findMany({
    where,
    skip,
    take,
    orderBy: { createdAt: 'desc' },
    include: {
      creator: { select: { name: true, email: true } },
      updater: { select: { name: true, email: true } },
    },
  });

  return { data, total };
}



export async function deleteAccount(id: string) {
  // Soft delete by setting isArchived to true


  return await prisma.user.update({
    where: { id },
    data: { isArchived: true, updatedById: (await getServerSession(authOptions))?.user?.id },
  });
}


export async function updateAccount(formData: FormData, id: string) {
  const { name, email, role } = FormSchemaUpdate.parse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
  });

  try {

    const updaterId = await getCurrentUserId();
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { name, email, role, updatedById: updaterId },
    });

    return updatedUser;
  } catch (error) {
    console.error("Error updating account:", error);
    throw error;
  }
}
