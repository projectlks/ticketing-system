import { getCurrentUserId } from "@/libs/action";
import {
  CreationMode,
  Priority,
  Prisma,
  Status,
} from "@/generated/prisma/client";
import { prisma } from "@/libs/prisma";
import { getOrSetCache, hashKeyPayload } from "@/libs/redis-cache";
import {
  HELPDESK_CACHE_TTL_SECONDS,
  helpdeskRedisKeys,
} from "../../cache/redis-keys";
import {
  ACTIVE_WORK_STATUSES,
  CLOSED_LIKE_STATUSES,
  type GetTicketsOptions,
  type SingleTicket,
  type TicketActionResult,
  type TicketWithRelations,
  VALID_CREATION_MODE_SET,
  VALID_PRIORITY_SET,
  VALID_STATUS_SET,
  getMyanmarDayRange,
  toErrorMessage,
} from "./shared";

export async function getSingleTicket(
  id: string,
): Promise<SingleTicket | null> {
  return getOrSetCache(
    helpdeskRedisKeys.singleTicket(id),
    HELPDESK_CACHE_TTL_SECONDS.singleTicket,
    async () =>
      prisma.ticket.findFirst({
        where: { id },
        select: {
          id: true,
          ticketId: true,
          title: true,
          description: true,
          departmentId: true,
          categoryId: true,
          priority: true,
          status: true,
          requesterId: true,
          assignedToId: true,
          resolutionDue: true,
          responseDue: true,
          images: {
            select: {
              id: true,
              url: true,
            },
          },
        },
      }),
  );
}

export async function getAllTickets(
  options?: GetTicketsOptions,
): Promise<{ tickets: TicketWithRelations[]; total: number }> {
  const normalizedOptions = {
    search: options?.search ?? {},
    filters: options?.filters ?? {},
    page: options?.page ?? 1,
    pageSize: options?.pageSize ?? 20,
  };
  const currentUserId = await getCurrentUserId();
  const signature = hashKeyPayload({
    normalizedOptions,
    currentUserId: currentUserId ?? null,
  });
  const cacheKey = helpdeskRedisKeys.ticketsList(currentUserId, signature);

  return getOrSetCache(
    cacheKey,
    HELPDESK_CACHE_TTL_SECONDS.ticketsList,
    async () => {
      const { search, filters, page, pageSize } = normalizedOptions;
      const safePage = Math.max(1, page);
      const safePageSize = Number.isFinite(pageSize)
        ? Math.max(0, Math.floor(pageSize))
        : 20;
      const showAllRows = safePageSize === 0;
      const where: Prisma.TicketWhereInput = { isArchived: false };

      if (search) {
        const orArray: Prisma.TicketWhereInput[] = [];
        const searchArray = Object.entries(search);

        for (const [columnKey, values] of searchArray) {
          for (const value of values) {
            if (!value) continue;

            const normalizedKey = columnKey.replace(/\s+/g, "").toLowerCase();
            if (normalizedKey === "ticketid") {
              orArray.push({
                ticketId: { contains: value, mode: "insensitive" },
              });
              continue;
            }
            if (normalizedKey === "title") {
              orArray.push({
                title: { contains: value, mode: "insensitive" },
              });
              continue;
            }
            if (normalizedKey === "description") {
              orArray.push({
                description: { contains: value, mode: "insensitive" },
              });
              continue;
            }
            if (normalizedKey === "requester") {
              orArray.push({
                requester: { name: { contains: value, mode: "insensitive" } },
              });
              continue;
            }
            if (normalizedKey === "assignedto") {
              orArray.push({
                assignedTo: { name: { contains: value, mode: "insensitive" } },
              });
              continue;
            }
            if (normalizedKey === "department") {
              orArray.push({
                department: { name: { contains: value, mode: "insensitive" } },
              });
              continue;
            }
            if (normalizedKey === "departmentid") {
              orArray.push({ departmentId: value });
            }
          }
        }

        if (orArray.length) {
          const currentAnd = Array.isArray(where.AND)
            ? where.AND
            : where.AND
              ? [where.AND]
              : [];
          where.AND = [...currentAnd, { OR: orArray }];
        }
      }

      if (filters) {
        for (const [group, values] of Object.entries(filters)) {
          if (!values.length) continue;

          if (group === "Status") {
            const statusValues = values.filter(
              (item): item is Status => VALID_STATUS_SET.has(item as Status),
            );
            if (statusValues.length) {
              where.status = { in: statusValues };
            }
          }

          if (group === "Priority") {
            const priorityValues = values.filter(
              (item): item is Priority =>
                VALID_PRIORITY_SET.has(item as Priority),
            );
            if (priorityValues.length) {
              where.priority = { in: priorityValues };
            }
          }

          if (group === "Creation Mode") {
            const modeValues = values.filter(
              (item): item is CreationMode =>
                VALID_CREATION_MODE_SET.has(item as CreationMode),
            );
            if (modeValues.length) {
              where.creationMode = { in: modeValues };
            }
          }

          if (group === "SLA") {
            const slaArray: Prisma.TicketWhereInput[] = [];
            if (values.includes("Violated")) slaArray.push({ isSlaViolated: true });
            if (values.includes("Not Violated")) {
              slaArray.push({ isSlaViolated: false });
            }
            if (slaArray.length) {
              const currentAnd = Array.isArray(where.AND)
                ? where.AND
                : where.AND
                  ? [where.AND]
                  : [];
              where.AND = [...currentAnd, { OR: slaArray }];
            }
          }

          if (group === "Ownership" && currentUserId) {
            const ownershipArray: Prisma.TicketWhereInput[] = [];
            if (values.includes("Unassigned")) {
              ownershipArray.push({ assignedToId: null });
            }
            if (values.includes("My Tickets")) {
              ownershipArray.push({ requesterId: currentUserId });
            }
            if (values.includes("Assigned To Me")) {
              ownershipArray.push({ assignedToId: currentUserId });
            }
            if (values.includes("Followed")) {
              ownershipArray.push({
                views: { some: { userId: currentUserId } },
              });
            }
            if (ownershipArray.length) {
              const currentAnd = Array.isArray(where.AND)
                ? where.AND
                : where.AND
                  ? [where.AND]
                  : [];
              where.AND = [...currentAnd, { OR: ownershipArray }];
            }
          }

          if (group === "Archived") {
            const hasArchived = values.includes("Archived");
            const hasUnArchived = values.includes("UnArchived");
            if (hasArchived && !hasUnArchived) {
              where.isArchived = true;
            } else if (hasUnArchived && !hasArchived) {
              where.isArchived = false;
            } else if (hasArchived && hasUnArchived) {
              delete where.isArchived;
            }
          }
        }
      }

      const total = await prisma.ticket.count({ where });
      const tickets = await prisma.ticket.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: showAllRows ? 0 : (safePage - 1) * safePageSize,
        ...(showAllRows ? {} : { take: safePageSize }),
        include: {
          requester: { select: { name: true, email: true } },
          assignedTo: { select: { name: true, email: true } },
          department: { select: { id: true, name: true } },
        },
      });

      return { tickets, total };
    },
  );
}

export async function getMyTickets(): Promise<
  TicketActionResult<{
    request: number;
    minor: number;
    major: number;
    critical: number;
    assignedTotal: number;
    openedRequest: number;
    openedMinor: number;
    openedMajor: number;
    openedCritical: number;
    openedTotal: number;
    closedCount: number;
    slaSuccess: number;
    slaFail: number;
  }>
> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { error: "Unauthorized" };
  }

  const cacheKey = helpdeskRedisKeys.myTickets(userId);
  try {
    const data = await getOrSetCache(
      cacheKey,
      HELPDESK_CACHE_TTL_SECONDS.myTickets,
      async () => {
        const priorityOrder: Priority[] = [
          "REQUEST",
          "MINOR",
          "MAJOR",
          "CRITICAL",
        ];
        const countByOwnerAndPriority = async (
          ownerField: "assignedToId" | "requesterId",
        ) => {
          const [request, minor, major, critical] = await Promise.all(
            priorityOrder.map((priority) =>
              prisma.ticket.count({
                where: {
                  [ownerField]: userId,
                  priority,
                  isArchived: false,
                  status: { in: ACTIVE_WORK_STATUSES },
                } as Prisma.TicketWhereInput,
              }),
            ),
          );
          return {
            request,
            minor,
            major,
            critical,
            total: request + minor + major + critical,
          };
        };

        const [assignedCounts, openedCounts] = await Promise.all([
          countByOwnerAndPriority("assignedToId"),
          countByOwnerAndPriority("requesterId"),
        ]);
        const { start: todayStart, end: todayEnd } = getMyanmarDayRange();
        const [closedCount, slaSuccess, slaFail] = await Promise.all([
          prisma.ticket.count({
            where: {
              assignedToId: userId,
              isArchived: false,
              status: { in: CLOSED_LIKE_STATUSES },
              updatedAt: { gte: todayStart, lte: todayEnd },
            },
          }),
          prisma.ticket.count({
            where: {
              assignedToId: userId,
              isArchived: false,
              status: { in: CLOSED_LIKE_STATUSES },
              updatedAt: { gte: todayStart, lte: todayEnd },
              isSlaViolated: false,
            },
          }),
          prisma.ticket.count({
            where: {
              assignedToId: userId,
              isArchived: false,
              status: { in: CLOSED_LIKE_STATUSES },
              updatedAt: { gte: todayStart, lte: todayEnd },
              isSlaViolated: true,
            },
          }),
        ]);

        return {
          request: assignedCounts.request,
          minor: assignedCounts.minor,
          major: assignedCounts.major,
          critical: assignedCounts.critical,
          assignedTotal: assignedCounts.total,
          openedRequest: openedCounts.request,
          openedMinor: openedCounts.minor,
          openedMajor: openedCounts.major,
          openedCritical: openedCounts.critical,
          openedTotal: openedCounts.total,
          closedCount,
          slaSuccess,
          slaFail,
        };
      },
    );

    return { data };
  } catch (error) {
    return { error: toErrorMessage(error, "Failed to load ticket stats.") };
  }
}

export async function getTicketAuditLogs(ticketId: string) {
  return getOrSetCache(
    helpdeskRedisKeys.ticketAudits(ticketId),
    HELPDESK_CACHE_TTL_SECONDS.ticketAudits,
    async () =>
      prisma.audit.findMany({
        where: {
          entity: "Ticket",
          entityId: ticketId,
        },
        orderBy: { changedAt: "desc" },
        include: {
          user: { select: { name: true, email: true } },
        },
      }),
  );
}

export async function getSlaViolationCount(): Promise<
  TicketActionResult<{ count: number }>
> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Unauthorized" };

  try {
    const count = await prisma.ticket.count({
      where: {
        isArchived: false,
        isSlaViolated: true,
        status: { notIn: CLOSED_LIKE_STATUSES },
      },
    });

    return { data: { count } };
  } catch (error) {
    return { error: toErrorMessage(error, "Failed to load SLA violations.") };
  }
}
