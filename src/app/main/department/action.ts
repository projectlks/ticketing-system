"use server";

import { prisma } from "@/libs/prisma";
import z from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { Prisma } from "@prisma/client";
import { DepartmentWithRelations } from "./page";
import { getCurrentUserId } from "@/libs/action";

// ===== Validation Schemas =====
const DepartmentFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contact: z.string().optional(),
  email: z.string().email("Invalid email address").optional(),
  managerId: z.string(),
  description: z.string().optional(),
});

const DepartmentFormSchemaUpdate = DepartmentFormSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be updated" }
);


// ===== Create Department =====

export async function createDepartment(
  formData: FormData
): Promise<{ success: boolean; data: DepartmentWithRelations }> {
  // Extract raw values safely, default optional strings to empty string if null
  const raw = {
    name: formData.get('name'),
    description: formData.get('description') ?? '',
    contact: formData.get('contact') ?? '',
    email: formData.get('email') ?? '',
    managerId: formData.get('managerId'),
  };

  // Validate required fields exist and parse with schema
  // Note: If 'name' or 'managerId' is null, schema parse will throw
  const parsed = DepartmentFormSchema.parse(raw);

  const creatorId = await getCurrentUserId();
  if (!creatorId) {
    throw new Error('User must be logged in to create a department');
  }


  // Create department record in DB
  const data = await prisma.department.create({
    data: {
      name: parsed.name,
      description: parsed.description,
      contact: parsed.contact,
      email: parsed.email,
      managerId: parsed.managerId,
      creatorId,
    },
    include: {
      creator: { select: { name: true, email: true } },
      manager: { select: { name: true, email: true } },
      // Add other relations if needed
    },
  });

  return { success: true, data };
}



// ===== Get Single Department =====
export async function getDepartment(id: string): Promise<DepartmentWithRelations | null> {
  return await prisma.department.findUnique({
    where: { id },
    include: {
      creator: { select: { name: true, email: true } },
      manager: { select: { name: true, email: true } },
    },
  });
}

// ===== Get All Departments =====
export async function getAllDepartments(
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
      
      ],
    }),
  };

  const total = await prisma.department.count({ where });

  const data = await prisma.department.findMany({
    where,
    skip,
    take,
    orderBy: { createdAt: "desc" },
    include: {
      creator: { select: { name: true, email: true } },
      manager: { select: { name: true, email: true } },
    },
  });

  return { data, total };
}

// ===== Delete Department (Soft Delete) =====
// Assuming you want soft delete, add isArchived field to Department model
export async function deleteDepartment(id: string) {
  const session = await getServerSession(authOptions);

  return await prisma.department.update({
    where: { id },
    data: {
      isArchived: true, // uncomment if you add this field
      updaterId: session?.user?.id, // if you track updater for department
    },
  });
}

// ===== Update Department =====
export async function updateDepartment(
  formData: FormData,
  id: string
): Promise<{ success: boolean; data: DepartmentWithRelations }> {
  const updateDataRaw = {
    name: formData.get("name"),
    description: formData.get("description"),
    contact: formData.get("contact"),
    email: formData.get("email"),
    managerId: formData.get("managerId"),
  };

  // Validate update data - partial allowed
  const updateData = DepartmentFormSchemaUpdate.parse(updateDataRaw);

  try {
    const updaterId = await getCurrentUserId();

    const data = await prisma.department.update({
      where: { id },
      data: {
        ...updateData,
        updaterId: updaterId, // if you track updater field on department
      },
      include: {
        creator: { select: { name: true, email: true } },
        manager: { select: { name: true, email: true } },
      },
    });

    return { success: true, data };
  } catch (error) {
    console.error("Error updating department:", error);
    throw error;
  }
}



