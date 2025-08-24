"use server";

import { prisma } from "@/libs/prisma";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "../tickets/action";

interface TicketFilter {
  from?: string;
  to?: string;

}


export async function getAllTickets(
  datefilters?: TicketFilter,
  filters: { key: string; value: string }[] = [],
  page = 1,
  take = 10,
  viewedFilter?: "SEEN" | "UNSEEN",
  searchQuery?: string
) {
  const skip = (page - 1) * take;


  const where: Prisma.TicketWhereInput = { isArchived: false };

  // Date range filter
  if (datefilters?.from || datefilters?.to) {
    where.createdAt = {};
    if (datefilters.from) where.createdAt.gte = new Date(datefilters.from);
    if (datefilters.to) {
      const toDate = new Date(datefilters.to);
      toDate.setDate(toDate.getDate() + 1);
      where.createdAt.lt = toDate;
    }
  }

  // Search filter
  if (searchQuery) {
    where.OR = [
      { title: { contains: searchQuery, mode: "insensitive" } },
      { description: { contains: searchQuery, mode: "insensitive" } },
    ];
  }

  // Dynamic filters
  const prismaFilters: Prisma.TicketWhereInput = {};
  filters.forEach((f) => {
    if (f.key === "Assigned") {
      prismaFilters.assignedToId = f.value === "Assigned" ? { not: null } : null;
    } else if (f.key === "Status") {
      const statusMap: Record<string, Prisma.TicketWhereInput["status"]> = {
        Open: "OPEN",
        "In Progress": "IN_PROGRESS",
        Resolved: "RESOLVED",
        Closed: "CLOSED",
      };
      prismaFilters.status = statusMap[f.value] || undefined;
    } else if (f.key === "Priority") {
      const priorityMap: Record<string, Prisma.TicketWhereInput["priority"]> = {
        Low: "LOW",
        Medium: "MEDIUM",
        High: "HIGH",
        Urgent: "URGENT",
      };
      prismaFilters.priority = priorityMap[f.value] || undefined;
    }
  });
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  // Viewed filter
  if (viewedFilter === "SEEN") prismaFilters.views = { some: { userId: user.id } };
  if (viewedFilter === "UNSEEN") prismaFilters.views = { none: { userId: user.id } };

  const finalWhere: Prisma.TicketWhereInput = { ...where, ...prismaFilters };

  const total = await prisma.ticket.count({ where: finalWhere });

  const data = await prisma.ticket.findMany({
    where: finalWhere,
    orderBy: { createdAt: "desc" },
    skip,
    take,
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

