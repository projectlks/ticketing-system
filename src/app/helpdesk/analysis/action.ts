"use server";

import { Priority, Status } from "@/generated/prisma/client";
import dayjs from "@/libs/dayjs";
import { prisma } from "@/libs/prisma";
import { getOrSetCache } from "@/libs/redis-cache";

import {
  HELPDESK_CACHE_TTL_SECONDS,
  helpdeskRedisKeys,
} from "../cache/redis-keys";
import { buildTicketDateWhere } from "./date-filter";

export type AnalysisFilterInput = {
  fromDate?: string;
  toDate?: string;
};

export type AnalysisTicketData = {
  department: string;
  tickets: Record<string, number>;
};

export type AnalysisRecentTicket = {
  id: string;
  title: string;
  department: string;
  priority: "high" | "medium" | "low";
  status: "open" | "closed" | "pending";
  created: string;
};

export type AnalysisPriorityBreakdown = {
  high: number;
  medium: number;
  low: number;
};

export type AnalysisKpi = {
  totalTickets: number;
  openTickets: number;
  closedTickets: number;
  highPriorityTickets: number;
};

export type AnalysisDashboardData = {
  ticketData: AnalysisTicketData[];
  recentTickets: AnalysisRecentTicket[];
  priorityBreakdown: AnalysisPriorityBreakdown;
  kpi: AnalysisKpi;
};

export type AnalysisDashboardResult = {
  data?: AnalysisDashboardData;
  error?: string;
};

type TicketBuckets = {
  open: number;
  closed: number;
  pending: number;
};

const RECENT_TICKET_LIMIT = 5;
const CLOSED_STATUSES = new Set<Status>(["CLOSED", "RESOLVED", "CANCELED"]);
const PENDING_STATUSES = new Set<Status>(["IN_PROGRESS"]);

const STATUS_LABEL = {
  open: "Open",
  closed: "Closed",
  pending: "Pending",
} as const;

const createEmptyBuckets = (): TicketBuckets => ({
  open: 0,
  closed: 0,
  pending: 0,
});

const toPriorityLevel = (
  priority: Priority | null,
): AnalysisRecentTicket["priority"] => {
  if (priority === "CRITICAL" || priority === "MAJOR") return "high";
  if (priority === "MINOR") return "medium";
  return "low";
};

const getStatusBucket = (status: Status): keyof TicketBuckets => {
  if (CLOSED_STATUSES.has(status)) return "closed";
  if (PENDING_STATUSES.has(status)) return "pending";
  return "open";
};

const toTicketStatus = (status: Status): AnalysisRecentTicket["status"] =>
  getStatusBucket(status);

const getPriorityBucket = (
  priority: Priority | null,
): keyof AnalysisPriorityBreakdown => {
  if (priority === "CRITICAL" || priority === "MAJOR") return "high";
  if (priority === "MINOR") return "medium";
  return "low";
};

export async function getAnalysisDashboardData(
  filters: AnalysisFilterInput = {},
): Promise<AnalysisDashboardResult> {
  const fromDate = filters.fromDate ?? "";
  const toDate = filters.toDate ?? "";
  const cacheKey = helpdeskRedisKeys.analysis(fromDate, toDate);

  const { where, error } = buildTicketDateWhere({ fromDate, toDate });
  if (error) {
    return { error };
  }

  try {
    const dashboardData = await getOrSetCache(
      cacheKey,
      HELPDESK_CACHE_TTL_SECONDS.analysis,
      async () => {
        const [departments, statusGroups, priorityGroups, recentTicketsRaw] =
          await Promise.all([
            prisma.department.findMany({
              where: { isArchived: false },
              orderBy: { name: "asc" },
              select: { id: true, name: true },
            }),
            prisma.ticket.groupBy({
              by: ["departmentId", "status"],
              where,
              _count: { _all: true },
            }),
            prisma.ticket.groupBy({
              by: ["priority"],
              where,
              _count: { _all: true },
            }),
            prisma.ticket.findMany({
              where,
              orderBy: { createdAt: "desc" },
              take: RECENT_TICKET_LIMIT,
              select: {
                ticketId: true,
                title: true,
                priority: true,
                status: true,
                createdAt: true,
                department: { select: { name: true } },
              },
            }),
          ]);

        const statusTotals = createEmptyBuckets();
        const unassignedTotals = createEmptyBuckets();
        const departmentMap = new Map<string, TicketBuckets>();

        for (const row of statusGroups) {
          const count = row._count._all;
          const statusBucket = getStatusBucket(row.status);

          statusTotals[statusBucket] += count;

          if (!row.departmentId) {
            unassignedTotals[statusBucket] += count;
            continue;
          }

          const current = departmentMap.get(row.departmentId) ?? createEmptyBuckets();
          current[statusBucket] += count;
          departmentMap.set(row.departmentId, current);
        }

        const ticketData: AnalysisTicketData[] = departments.map((department) => {
          const counts = departmentMap.get(department.id) ?? createEmptyBuckets();

          return {
            department: department.name,
            tickets: {
              [STATUS_LABEL.open]: counts.open,
              [STATUS_LABEL.closed]: counts.closed,
              [STATUS_LABEL.pending]: counts.pending,
            },
          };
        });

        const unassignedTotal =
          unassignedTotals.open + unassignedTotals.closed + unassignedTotals.pending;

        if (unassignedTotal > 0) {
          ticketData.push({
            department: "Unassigned",
            tickets: {
              [STATUS_LABEL.open]: unassignedTotals.open,
              [STATUS_LABEL.closed]: unassignedTotals.closed,
              [STATUS_LABEL.pending]: unassignedTotals.pending,
            },
          });
        }

        const priorityBreakdown: AnalysisPriorityBreakdown = {
          high: 0,
          medium: 0,
          low: 0,
        };

        for (const row of priorityGroups) {
          const priorityBucket = getPriorityBucket(row.priority as Priority | null);
          priorityBreakdown[priorityBucket] += row._count._all;
        }

        const recentTickets: AnalysisRecentTicket[] = recentTicketsRaw.map((ticket) => ({
          id: ticket.ticketId,
          title: ticket.title,
          department: ticket.department?.name ?? "Unassigned",
          priority: toPriorityLevel(ticket.priority),
          status: toTicketStatus(ticket.status),
          created: dayjs(ticket.createdAt).fromNow(),
        }));

        const kpi: AnalysisKpi = {
          totalTickets: statusTotals.open + statusTotals.closed + statusTotals.pending,
          openTickets: statusTotals.open,
          closedTickets: statusTotals.closed,
          highPriorityTickets: priorityBreakdown.high,
        };

        return {
          ticketData,
          recentTickets,
          priorityBreakdown,
          kpi,
        };
      },
    );

    return { data: dashboardData };
  } catch (error) {
    console.error("[analysis] failed to load dashboard data", {
      message: error instanceof Error ? error.message : String(error),
    });
    return { error: "Failed to load analysis dashboard data." };
  }
}
