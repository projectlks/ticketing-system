"use server";

import { prisma } from "@/libs/prisma";
import { Prisma } from "@prisma/client";

interface TicketFilter {
  from?: string;
  to?: string;
}

export async function getAllTickets(filters?: TicketFilter) {
  const where: Prisma.TicketWhereInput = { isArchived: false };

  if (filters?.from || filters?.to) {
    where.createdAt = {};
    if (filters.from) {
      where.createdAt.gte = new Date(filters.from); // start of 'from' day
    }
    if (filters.to) {
      const toDate = new Date(filters.to);
      toDate.setDate(toDate.getDate() + 1); // include whole 'to' day
      where.createdAt.lt = toDate; // less than next day
    }
  }

  const total = await prisma.ticket.count({ where });

  const data = await prisma.ticket.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      requester: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      category: true,
      subcategory: true,
      department: true,
      images: true,
      comments: {
        include: {
          commenter: { select: { id: true, name: true, email: true } },
          likes: { include: { user: { select: { id: true, name: true } } } },
          replies: true,
        },
      },
    },
  });

  return { data, total };
}
