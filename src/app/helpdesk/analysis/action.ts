"use server";

import { Priority, Status } from "@/generated/prisma/client";
import { prisma } from "@/libs/prisma";
import { formatDistanceToNow } from "date-fns";
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

type TicketBuckets = {
  open: number;
  closed: number;
  pending: number;
};

// Aggregation လုပ်ရာမှာ default count object အနေနဲ့ပြန်သုံးဖို့ helper။
const createEmptyBuckets = (): TicketBuckets => ({
  open: 0,
  closed: 0,
  pending: 0,
});

// DB priority enum ကို dashboard UI level (high/medium/low) အဖြစ် map လုပ်ပါတယ်။
const toPriorityLevel = (
  priority: Priority | null,
): AnalysisRecentTicket["priority"] => {
  if (priority === "CRITICAL" || priority === "MAJOR") return "high";
  if (priority === "MINOR") return "medium";
  return "low";
};

// Internal status enum ကို analysis card/table ဖော်ပြမယ့် open/closed/pending အဖြစ်ပြောင်းပါတယ်။
const toTicketStatus = (status: Status): AnalysisRecentTicket["status"] => {
  if (status === "CLOSED" || status === "CANCELED") return "closed";
  if (status === "IN_PROGRESS" || status === "RESOLVED") return "pending";
  return "open";
};

// Status ကို aggregation bucket key နဲ့ချိတ်ဖို့ helper သီးသန့်ထားပါတယ်။
const getStatusBucket = (status: Status): keyof TicketBuckets => {
  if (status === "CLOSED" || status === "CANCELED") return "closed";
  if (status === "IN_PROGRESS" || status === "RESOLVED") return "pending";
  return "open";
};

// Priority groupBy ရလဒ်ကို KPI breakdown key နဲ့ချိတ်ဖို့ helper။
const getPriorityBucket = (
  priority: Priority | null,
): keyof AnalysisPriorityBreakdown => {
  if (priority === "CRITICAL" || priority === "MAJOR") return "high";
  if (priority === "MINOR") return "medium";
  return "low";
};

export async function getAnalysisDashboardData(
  filters: AnalysisFilterInput = {},
): Promise<AnalysisDashboardData> {
  // Shared helper သုံးပြီး date range filter + base where condition တည်ဆောက်ပါတယ်။
  const where = buildTicketDateWhere(filters);

  // Dashboard render အတွက်လိုအပ်တဲ့ data တွေကို parallel query လုပ်ပြီး response time လျှော့ထားပါတယ်။
  const [departments, groupedByDepartmentStatus, groupedByPriority, recent] =
    await Promise.all([
      prisma.department.findMany({
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
        take: 10,
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

  // Department/status count result တွေကို card/chart တွေသုံးနိုင်ဖို့ normalize ပြန်စီမယ်။
  const statusTotals = createEmptyBuckets();
  const unassignedTotals = createEmptyBuckets();
  const departmentMap = new Map<string, TicketBuckets>();

  for (const row of groupedByDepartmentStatus) {
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

  // Department list ကိုအခြေခံပြီး stable order ဖြင့် ticketData array ပြန်တည်ဆောက်ပါတယ်။
  const ticketData: AnalysisTicketData[] = departments.map((department) => {
    const counts = departmentMap.get(department.id) ?? createEmptyBuckets();

    return {
      department: department.name,
      tickets: {
        Open: counts.open,
        Closed: counts.closed,
        Pending: counts.pending,
      },
    };
  });

  const unassignedTotal =
    unassignedTotals.open + unassignedTotals.closed + unassignedTotals.pending;
  if (unassignedTotal > 0) {
    // Department မသတ်မှတ်ထားသေးတဲ့ ticket တွေကို separate card အဖြစ်ပြသဖို့ထည့်ထားပါတယ်။
    ticketData.push({
      department: "Unassigned",
      tickets: {
        Open: unassignedTotals.open,
        Closed: unassignedTotals.closed,
        Pending: unassignedTotals.pending,
      },
    });
  }

  const priorityBreakdown: AnalysisPriorityBreakdown = {
    high: 0,
    medium: 0,
    low: 0,
  };

  // Priority groupBy result ကနေ KPI doughnut chart data ကိုစုပေါင်းပါတယ်။
  for (const row of groupedByPriority) {
    const priorityBucket = getPriorityBucket(row.priority as Priority | null);
    priorityBreakdown[priorityBucket] += row._count._all;
  }

  // Recent table အတွက် user-friendly format (relative time + mapped labels) ပြန်ပေးပါတယ်။
  const recentTickets: AnalysisRecentTicket[] = recent.slice(0, 5).map((ticket) => ({
    id: ticket.ticketId,
    title: ticket.title,
    department: ticket.department?.name ?? "Unassigned",
    priority: toPriorityLevel(ticket.priority),
    status: toTicketStatus(ticket.status),
    created: formatDistanceToNow(ticket.createdAt, { addSuffix: true }),
  }));

  // KPI cards တွေမှာသုံးဖို့ top-level totals ကိုတစ်နေရာတည်းမှာတွက်ထုတ်ထားပါတယ်။
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
}
