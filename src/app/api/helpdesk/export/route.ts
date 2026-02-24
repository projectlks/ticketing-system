import {
  buildTicketDateWhere,
  formatDateTimeInAnalysisTimeZone,
} from "@/app/helpdesk/analysis/date-filter";
import { Priority, Status } from "@/generated/prisma/client";
import { authOptions } from "@/libs/auth";
import { prisma } from "@/libs/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

// CSV format ထဲမှာ comma / quote / newline ပါလာနိုင်တဲ့ cell value တွေကို
// spreadsheet-compatible ဖြစ်အောင် escape လုပ်ပေးပါတယ်။
const csvEscape = (value: unknown): string => {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const normalizeQueryValue = (value: string | null): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const STATUS_VALUES = Object.values(Status) as Status[];
const PRIORITY_VALUES = Object.values(Priority) as Priority[];

const isValidStatus = (value: string): value is Status =>
  STATUS_VALUES.includes(value as Status);

const isValidPriority = (value: string): value is Priority =>
  PRIORITY_VALUES.includes(value as Priority);

const toSafeFilenamePart = (value: string): string =>
  value.replace(/[^a-zA-Z0-9_-]/g, "");

const toSlaWindowStatus = (
  status: Status,
  responseDue: Date | null,
  resolutionDue: Date | null,
  now: Date,
): string => {
  if (status === "CLOSED" || status === "RESOLVED" || status === "CANCELED") {
    return "Closed";
  }

  const due = resolutionDue ?? responseDue;
  if (!due) return "N/A";

  return due.getTime() < now.getTime() ? "Overdue" : "On Track";
};

export async function GET(req: NextRequest) {
  // Signed-in user မဟုတ်ရင် export မပေးဖို့ auth check လုပ်ထားပါတယ်။
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    // Dashboard date filter + optional granular filters တွေကို query မှာထည့်ပြီး export လုပ်နိုင်အောင် parse လုပ်ထားပါတယ်။
    const fromDate = normalizeQueryValue(req.nextUrl.searchParams.get("fromDate"));
    const toDate = normalizeQueryValue(req.nextUrl.searchParams.get("toDate"));
    const statusQuery = normalizeQueryValue(req.nextUrl.searchParams.get("status"));
    const priorityQuery = normalizeQueryValue(req.nextUrl.searchParams.get("priority"));
    const departmentIdQuery = normalizeQueryValue(
      req.nextUrl.searchParams.get("departmentId"),
    );

    const where = buildTicketDateWhere({ fromDate, toDate });

    if (statusQuery) {
      if (!isValidStatus(statusQuery)) {
        throw new Error(`Invalid status. Allowed values: ${STATUS_VALUES.join(", ")}.`);
      }
      where.status = statusQuery;
    }

    if (priorityQuery) {
      if (!isValidPriority(priorityQuery)) {
        throw new Error(
          `Invalid priority. Allowed values: ${PRIORITY_VALUES.join(", ")}.`,
        );
      }
      where.priority = priorityQuery;
    }

    if (departmentIdQuery) {
      where.departmentId = departmentIdQuery;
    }

    // CSV columns အတွက်လိုအပ်တဲ့ relational data (department/requester/assignee) ကိုပါ query လုပ်ထားပါတယ်။
    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        ticketId: true,
        title: true,
        priority: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        responseDue: true,
        resolutionDue: true,
        isSlaViolated: true,
        department: { select: { name: true } },
        requester: { select: { name: true, email: true } },
        assignedTo: { select: { name: true, email: true } },
      },
    });

    // Header row order သည် generated CSV columns order နဲ့တစ်ထပ်တည်းဖြစ်ရပါမယ်။
    const headers = [
      "Ticket ID",
      "Title",
      "Department",
      "Priority",
      "Status",
      "Created At",
      "Updated At",
      "Response Due",
      "Resolution Due",
      "SLA Window Status",
      "Requester",
      "Requester Email",
      "Assigned To",
      "Assigned Email",
      "SLA Violated",
    ];

    const now = new Date();

    // Ticket object တွေကို CSV row array ပုံစံသို့ပြောင်းပါတယ်။
    const rows = tickets.map((ticket) => [
      ticket.ticketId,
      ticket.title,
      ticket.department?.name ?? "Unassigned",
      ticket.priority ?? "",
      ticket.status,
      formatDateTimeInAnalysisTimeZone(ticket.createdAt),
      formatDateTimeInAnalysisTimeZone(ticket.updatedAt),
      formatDateTimeInAnalysisTimeZone(ticket.responseDue),
      formatDateTimeInAnalysisTimeZone(ticket.resolutionDue),
      toSlaWindowStatus(ticket.status, ticket.responseDue, ticket.resolutionDue, now),
      ticket.requester?.name ?? "",
      ticket.requester?.email ?? "",
      ticket.assignedTo?.name ?? "",
      ticket.assignedTo?.email ?? "",
      ticket.isSlaViolated ? "Yes" : "No",
    ]);

    // UTF-8 BOM ထည့်ထားလို့ Excel ဖွင့်တဲ့အခါ မြန်မာ/Unicode စာလုံးမပျက်အောင်ကူညီပေးပါတယ်။
    const csv = [
      headers.map(csvEscape).join(","),
      ...rows.map((row) => row.map(csvEscape).join(",")),
    ].join("\n");

    const filenameParts = ["helpdesk-analysis"];
    if (fromDate) filenameParts.push(`from-${toSafeFilenamePart(fromDate)}`);
    if (toDate) filenameParts.push(`to-${toSafeFilenamePart(toDate)}`);
    if (statusQuery) filenameParts.push(`status-${toSafeFilenamePart(statusQuery)}`);
    if (priorityQuery) {
      filenameParts.push(`priority-${toSafeFilenamePart(priorityQuery)}`);
    }
    if (departmentIdQuery) {
      filenameParts.push(`department-${toSafeFilenamePart(departmentIdQuery)}`);
    }

    const filename = `${filenameParts.join("_")}.csv`;

    // Attachment header သတ်မှတ်ပြီး browser က file download လုပ်အောင်ပြန်ပို့ပါတယ်။
    return new NextResponse(`\uFEFF${csv}`, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=\"${filename}\"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    // Invalid date/filter validation case တွေကို 400 ပြန်ပေးပြီး unexpected server issue တွေကို 500 ပြန်ပေးပါတယ်။
    const message =
      error instanceof Error ? error.message : "Failed to export tickets";
    const lower = message.toLowerCase();
    const isValidationError =
      lower.includes("fromdate") ||
      lower.includes("todate") ||
      lower.includes("date") ||
      lower.includes("status") ||
      lower.includes("priority");

    return NextResponse.json(
      { success: false, message },
      { status: isValidationError ? 400 : 500 },
    );
  }
}
