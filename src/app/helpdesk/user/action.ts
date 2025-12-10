"use server";

import { getCurrentUserId } from "@/libs/action";
import { prisma } from "@/libs/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { TicketStats } from "./page";

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

// Used for CREATE — id is not needed
const createSchema = UserFormSchema.omit({ id: true });

type CreateInput = z.infer<typeof createSchema>;
// type UpdateInput = z.infer<typeof UserFormSchema>;

// Clean update type (no id, no any)
// type UserUpdateData = Omit<UpdateInput, "id">;

/* -------------------------------
          CREATE USER
-------------------------------- */
export async function createUser(formData: FormData): Promise<void> {
  // Extract formData manually to prevent "any"
  const raw: CreateInput = {
    name: formData.get("name")?.toString() ?? "",
    email: formData.get("email")?.toString() ?? "",
    password: formData.get("password")?.toString() ?? "",
    department: formData.get("department")?.toString() ?? "",
    role: formData.get("role")?.toString() as CreateInput["role"],
  };

  const parsed = createSchema.parse(raw);

  // Check duplicate email
  const existingUser = await prisma.user.findUnique({
    where: { email: parsed.email },
  });

  if (existingUser) throw new Error("User with this email already exists");

  // Ensure department exists
  const department = await prisma.department.findUnique({
    where: { id: parsed.department },
  });

  if (!department) throw new Error("Selected department does not exist");

  const currentUserId = await getCurrentUserId();
  if (!currentUserId) throw new Error("Unauthorized");

  // Hash password
  const hashedPassword = await bcrypt.hash(parsed.password, 10);

  // Create the user
  const newUser = await prisma.user.create({
    data: {
      name: parsed.name,
      email: parsed.email,
      password: hashedPassword,
      departmentId: parsed.department,
      role: parsed.role,
      creatorId: currentUserId,
    },
  });

  // Add audit log
  await prisma.audit.create({
    data: {
      entity: "User",
      entityId: newUser.id,
      field: "ALL",
      oldValue: "",
      newValue: "",
      userId: currentUserId,
      action: "CREATE",
    },
  });
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
    include: { department: true }, // include department for audit
  });
  if (!oldUser) throw new Error("User not found");

  // Build update data
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
    include: { department: true }, // include for audit
  });

  // ---- Audit log ----
  const changedFields: Array<keyof typeof updateData> = ["name", "email", "role", "departmentId"];
  for (const field of changedFields) {
    let oldValue = "";
    let newValue = "";

    if (field === "departmentId") {
      oldValue = oldUser.department?.name ?? "";
      newValue = updated.department?.name ?? "";
    } else {
      oldValue = String(oldUser[field] ?? "");
      newValue = String(updateData[field] ?? "");
    }

    if (oldValue !== newValue) {
      await prisma.audit.create({
        data: {
          entity: "User",
          entityId: updated.id,
          field,
          oldValue,
          newValue,
          userId: currentUserId,
          action: "UPDATE",
        },
      });
    }
  }
}



export async function getUserById(id: string): Promise<{
  id: string;
  name: string;
  email: string;
  departmentId: string | null;
  role: Role;
}> {
  if (!id) throw new Error("User ID is required");

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
}



export async function getUserToAssign(): Promise<{
  id: string, name: string, email: string, departmentId: string
}[]> {

  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      departmentId: true,
    }
  })

}

// export async function getUsers(): Promise<TicketStats[]> {
//   const users = await prisma.user.findMany({
//     orderBy: { name: "asc" },
//     select: {
//       id: true,
//       name: true,
//       email: true,

//     },
//   });

//   const results: TicketStats[] = [];

//   for (const user of users) {
//     const [
//       open,
//       inprogess,
//       closed,
//     ] = await Promise.all([
//       prisma.ticket.count({
//         where: { assignedToId: user.id, status: "OPEN" },
//       }),

//       prisma.ticket.count({
//         where: { departmentId: user.id, status: "IN_PROGRESS" },
//       }),

//       prisma.ticket.count({
//         where: { departmentId: user.id, status: "CLOSED" },
//       }),


//     ]);

//     results.push({
//       id: user.id,
//       name: user.name,
//       email: user.email,
//       count: {
//         open,
//         inprogess,
//         closed,
//       },
//     });
//   }

//   return results;
// }
export async function getUsers(): Promise<TicketStats[]> {
  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  const results: TicketStats[] = [];

  for (const user of users) {
    const [
      newAssigned,
      openAssigned,
      inProgressAssigned,
      closedAssigned,

      newCreated,
      openCreated,
      inProgressCreated,
      closedCreated
    ] = await Promise.all([

      // Assigned to this user
      prisma.ticket.count({
        where: { assignedToId: user.id, status: "NEW" },
      }),
      prisma.ticket.count({
        where: { assignedToId: user.id, status: "OPEN" },
      }),
      prisma.ticket.count({
        where: { assignedToId: user.id, status: "IN_PROGRESS" },
      }),
      prisma.ticket.count({
        where: { assignedToId: user.id, status: "CLOSED" },
      }),

      // Created by this user
      prisma.ticket.count({
        where: { requesterId: user.id, status: "NEW" },
      }),
      prisma.ticket.count({
        where: { requesterId: user.id, status: "OPEN" },
      }),
      prisma.ticket.count({
        where: { requesterId: user.id, status: "IN_PROGRESS" },
      }),
      prisma.ticket.count({
        where: { requesterId: user.id, status: "CLOSED" },
      }),
    ]);

    results.push({
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
    });
  }

  return results;
}
