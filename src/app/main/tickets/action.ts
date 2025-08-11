"use server";

import { prisma } from "@/libs/prisma";
import z from "zod";
import { getCurrentUserId } from "@/libs/action";
import { AuditChange } from "@/libs/action";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { Prisma } from "@prisma/client";

// Validation schema for ticket creation
const TicketCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  categoryId: z.string(),
  departmentId: z.string(),
  requesterId: z.string(),
  channelId: z.string(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  // attached: z.string().optional(),
});

// Partial schema for updates (requesterId usually shouldn't change)
const TicketUpdateSchema = TicketCreateSchema.partial().omit({
  requesterId: true,
});

// Create Ticket
export async function createTicket(formData: FormData) {
  const raw = {
    title: formData.get("title"),
    description: formData.get("description"),
    categoryId: formData.get("categoryId"),
    departmentId: formData.get("departmentId"),
    requesterId: formData.get("requesterId"),
    assignedToId: formData.get("assignedToId"),
    channelId: formData.get("channelId"),
    // status: formData.get("status"),
    priority: formData.get("priority"),
    attached: formData.get("attached"),
  };

  const data = TicketCreateSchema.parse(raw);

  const ticket = await prisma.ticket.create({
    data: {
      ...data,
      ticketId: `TICKET-${Date.now()}`, // Simple ticket ID generation
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  return ticket;
}

// Get Single Ticket
export async function getTicket(id: string) {
  return await prisma.ticket.findUnique({
    where: { id },
    include: {
      category: true,
      department: true,
      requester: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });
}

// Get All Tickets (with pagination and optional search/filter)
export async function getAllTickets(
  page = 1,
  searchQuery = "",
  filters: Record<string, unknown> = {}
) {
  const take = 10;
  const skip = (page - 1) * take;
  const trimmedQuery = searchQuery.trim();

  const where = {
    ...filters,
    ...(trimmedQuery && {
      OR: [
        { title: { contains: trimmedQuery, mode: Prisma.QueryMode.insensitive } },
        { description: { contains: trimmedQuery, mode: Prisma.QueryMode.insensitive } },
      ],
    }),
  };

  const total = await prisma.ticket.count({ where });

  const data = await prisma.ticket.findMany({
    where,
    skip,
    take,
    orderBy: { createdAt: "desc" },
    include: {
      category: true,
      department: true,
      requester: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });

  return { data, total };
}

// Update Ticket (with audit logs)
export async function updateTicket(formData: FormData, id: string) {
  const updateDataRaw = {
    title: formData.get("title"),
    description: formData.get("description"),
    categoryId: formData.get("categoryId"),
    departmentId: formData.get("departmentId"),
    assignedToId: formData.get("assignedToId"),
    channelId: formData.get("channelId"),
    status: formData.get("status"),
    priority: formData.get("priority"),
    attached: formData.get("attached"),
  };

  const updateData = TicketUpdateSchema.parse(updateDataRaw);

  const updaterId = await getCurrentUserId();
  if (!updaterId) throw new Error("No logged-in user found");

  const current = await prisma.ticket.findUniqueOrThrow({ where: { id } });

  // Audit changes
  const changes: AuditChange[] = Object.entries(updateData).flatMap(([field, newVal]) => {
    const oldVal = (current as Record<string, unknown>)[field];
    if (oldVal?.toString() !== newVal?.toString()) {
      return [{
        field,
        oldValue: oldVal?.toString() ?? "",
        newValue: newVal?.toString() ?? "",
      }];
    }
    return [];
  });

  await prisma.ticket.update({
    where: { id },
    data: { ...updateData, updatedAt: new Date() },
  });

  if (changes.length) {
    await prisma.audit.createMany({
      data: changes.map((c) => ({
        entity: "Ticket",
        entityId: id,
        field: c.field,
        oldValue: c.oldValue,
        newValue: c.newValue,
        userId: updaterId,
      })),
    });
  }

  return await getTicket(id);
}

// Delete Ticket (soft delete example)
export async function deleteTicket(id: string) {
  // Optional: get logged-in user to track who deleted
  const session = await getServerSession(authOptions);

  return await prisma.ticket.update({
    where: { id },
    data: {
      isArchived: true, // add this boolean to your Ticket model if not present
      updatedAt: new Date(),
      // updaterId: session?.user?.id, // if you add updater relation
    },
  });
}

// Get audit logs for a ticket
export async function getTicketAuditLogs(ticketId: string) {
  return await prisma.audit.findMany({
    where: {
      entity: "Ticket",
      entityId: ticketId,
    },
    orderBy: { changedAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
    },
  });
}
