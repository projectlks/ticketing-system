"use server";

import { prisma } from "@/libs/prisma";
import z from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { Prisma } from "@prisma/client";
import { DepartmentWithRelations } from "./page";
import { AuditChange, getCurrentUserId } from "@/libs/action";
import { getCurrentUser } from "../tickets/action";

// ===== Validation Schemas =====
const DepartmentFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contact: z.string().optional(),
  email: z.string().email("Invalid email address").optional(),
  // managerId: z.string().optional(),
  description: z.string().optional(),
});

const DepartmentFormSchemaUpdate = DepartmentFormSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be updated" }
);


// ===== Create Department =====

export async function createDepartment(
  formData: FormData,
  jobPositions: { title: string }[]
): Promise<{ success: boolean; data: DepartmentWithRelations }> {
  const raw = {
    name: formData.get("name")?.toString() ?? "",
    description: formData.get("description")?.toString() ?? "",
    contact: formData.get("contact")?.toString() ?? "",
    email: formData.get("email")?.toString() ?? "",
  };

  // Validate input
  const parsed = DepartmentFormSchema.parse(raw);

  const managerId: string | null = formData.get("managerId")?.toString() || null;

  if (managerId) {
    const userExists = await prisma.user.findUnique({ where: { id: managerId } });
    if (!userExists) {
      throw new Error("Selected manager does not exist");
    }
  }




  const creatorId = await getCurrentUserId();
  if (!creatorId) throw new Error("User must be logged in to create a department");

  // ✅ Check if department name already exists
  const existingDepartment = await prisma.department.findUnique({
    where: { name: parsed.name },
  });

  if (existingDepartment) {
    throw new Error("Department with this name already exists");
  }

  // Create department
  const department = await prisma.department.create({
    data: {
      name: parsed.name,
      description: parsed.description,
      contact: parsed.contact,
      email: parsed.email,
      managerId,
      creatorId,
    },
    include: {
      creator: { select: { name: true, email: true } },
      manager: { select: { name: true, email: true } },
    },
  });

  // Create job positions
  if (jobPositions.length > 0) {
    const jobPositionsData = jobPositions.map((job) => ({
      departmentId: department.id,
      name: job.title,
      creatorId,
    }));

    await prisma.jobPosition.createMany({ data: jobPositionsData });
  }

  // Return department including job positions
  const dataWithJobs = await prisma.department.findUnique({
    where: { id: department.id },
    include: {
      creator: { select: { name: true, email: true } },
      manager: { select: { name: true, email: true } },
      positions: true, // include newly added job positions
    },
  });

  if (!dataWithJobs) throw new Error("Department not found after creation");

  return { success: true, data: dataWithJobs };
}



// ===== Get Single Department =====
export async function getDepartment(id: string): Promise<DepartmentWithRelations | null> {
  return await prisma.department.findUnique({
    where: { id },
    include: {
      creator: { select: { name: true, email: true } },
      manager: { select: { name: true, email: true } },
      tickets: { select: { id: true, title: true, status: true } },
      updater: { select: { name: true, email: true } },
      positions: { select: { id: true, name: true } }, // ✅ Include Job Positions


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

  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized user");




  const where = {

    // ...(user.role !== "SUPER_ADMIN" && { isArchived: false }),
    ...(user?.role !== "SUPER_ADMIN" && { isArchived: false }),
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


export async function restoreDepartment(id: string) {
  const session = await getServerSession(authOptions);

  return await prisma.department.update({
    where: { id },
    data: {
      isArchived: false, // uncomment if you add this field
      updaterId: session?.user?.id, // if you track updater for department
    },
  });
}




// ===== Update Department with Audit =====
export async function updateDepartment(
  formData: FormData,
  id: string,
  jobPositions: { id?: string; title: string }[]
): Promise<{ success: boolean; data: DepartmentWithRelations; changes: AuditChange[] }> {
  const updateDataRaw = {
    name: formData.get("name")?.toString() ?? "",
    description: formData.get("description")?.toString() ?? "",
    contact: formData.get("contact")?.toString() ?? "",
    email: formData.get("email")?.toString() ?? "",
    // managerId: formData.get("managerId")?.toString() ?? undefined,
  };

  // Validate update data
  const updateData = DepartmentFormSchemaUpdate.parse(updateDataRaw);

  const managerId: string | null = formData.get("managerId")?.toString() || null;

  if (managerId) {
    const userExists = await prisma.user.findUnique({ where: { id: managerId } });
    if (!userExists) {
      throw new Error("Selected manager does not exist");
    }
  }

  console.log("Parsed update data:", updateData);

  try {
    const updaterId = await getCurrentUserId();
    if (!updaterId) {
      throw new Error("No logged-in user found for updateDepartment");
    }

    // Fetch current department before update
    const current = await prisma.department.findUniqueOrThrow({ where: { id } });

    // Build audit change list
    const changes: AuditChange[] = Object.entries(updateData).flatMap(([field, newVal]) => {
      const oldVal = (current as Record<string, unknown>)[field];
      if (oldVal?.toString() !== newVal.toString()) {
        return [{
          field,
          oldValue: oldVal?.toString() ?? "",
          newValue: newVal?.toString() ?? "",
        }];
      }
      return [];
    });

    // Perform department update
    const data = await prisma.department.update({
      where: { id },
      data: {
        ...updateData,
        managerId,
        updaterId,
      },
      include: {
        creator: { select: { name: true, email: true } },
        manager: { select: { name: true, email: true } },
      },
    });

    // Handle job positions
    const currentPositions = await prisma.jobPosition.findMany({ where: { departmentId: id } });
    const currentPositionsMap = Object.fromEntries(currentPositions.map(p => [p.id, p]));

    for (const job of jobPositions) {
      if (job.id && currentPositionsMap[job.id]) {
        // Existing job → update title if changed
        if (currentPositionsMap[job.id].name !== job.title) {
          await prisma.jobPosition.update({
            where: { id: job.id }, // <-- exact where
            data: { name: job.title },
          });
        }
      } else {
        // New job → create
        await prisma.jobPosition.create({
          data: {
            name: job.title,
            departmentId: id,
            creatorId: updaterId,
          },
        });
      }
    }

    // Save audit logs if there are changes
    if (changes.length > 0) {
      await prisma.audit.createMany({
        data: changes.map(c => ({
          entity: "Department",
          entityId: id,
          field: c.field,
          oldValue: c.oldValue,
          newValue: c.newValue,
          userId: updaterId,
        })),
      });
    }

    return { success: true, data, changes };
  } catch (error) {
    console.error("Error updating department:", error);
    throw error;
  }
}




export async function getDepartmentAuditLogs(departmentId: string) {
  return await prisma.audit.findMany({
    where: {
      entity: "Department",
      entityId: departmentId,
    },
    orderBy: { changedAt: "desc" },
    include: {
      user: { select: { name: true, email: true } }, // who made the change
    },
  });
}
