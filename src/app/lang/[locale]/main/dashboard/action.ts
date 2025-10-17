"use server";

import { PrismaClient, Prisma, Priority, Role } from "@prisma/client";
import { TicketWithRelations, AuditWithRelations } from "./page";

const prisma = new PrismaClient();

// Role-based where filter
const getRoleWhere = (role: Role, userId?: string, departmentId?: string): Prisma.TicketWhereInput => {
    if ((role === "REQUESTER" && userId)) return {
        OR: [
            { requesterId: userId },
            { assignedToId: userId },

            departmentId ? { departmentId } : {},
        ],
    };;
    if (role === "AGENT" && userId) return {

        // assignedToId: userId

        OR: [
            { requesterId: userId },
            { assignedToId: userId },
            departmentId ? { departmentId } : {},
        ],
    };
    return {}; // SUPER_ADMIN & ADMIN
};

// Fetch tickets with optional filters
interface TicketFilter {
    from?: string;
    to?: string;
    role?: Role;
    userId?: string;
    departmentId?: string;
}

export async function getAllTickets(filters?: TicketFilter) {
    const { from, to, role, userId, departmentId } = filters ?? {};

    const where: Prisma.TicketWhereInput = {
        isArchived: false,
        ...getRoleWhere(role!, userId, departmentId),
    };

    if (from || to) {
        where.createdAt = {};
        if (from) where.createdAt.gte = new Date(from);
        if (to) where.createdAt.lte = new Date(to + "T23:59:59.999Z");
    }

    const total = await prisma.ticket.count({ where });

    const data: TicketWithRelations[] = await prisma.ticket.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
            requester: { select: { id: true, name: true, email: true } },
            assignedTo: { select: { id: true, name: true, email: true } },
            category: true,
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

// Monthly stats
interface StatusCounts {
    all: number;
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
}

type Trend = "up" | "down" | "same";

export interface MonthlyStats {
    thisMonth: StatusCounts;
    lastMonth: StatusCounts;
    percentChange: StatusCounts;
    trends: { [K in keyof StatusCounts]: Trend };
}

const getTrend = (thisMonth: number, lastMonth: number): Trend => {
    if (thisMonth > lastMonth) return "up";
    if (thisMonth < lastMonth) return "down";
    return "same";
};

export async function getMonthlyTicketStatsByStatus(role?: Role, userId?: string): Promise<MonthlyStats> {
    const now = new Date();

    const thisMonthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    const nextMonthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1));
    const lastMonthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1));


    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { departmentId: true },
    });

    const departmentId = user?.departmentId ?? undefined;

    const tickets = await prisma.ticket.findMany({
        where: {
            createdAt: { gte: lastMonthStart, lt: nextMonthStart },
            isArchived: false,
            ...getRoleWhere(role!, userId, departmentId),
        },
        select: { status: true, createdAt: true },
    });

    const countTickets = (monthStart: Date, monthEnd: Date): StatusCounts => {
        const filtered = tickets.filter(t => t.createdAt >= monthStart && t.createdAt < monthEnd);
        return {
            all: filtered.length,
            open: filtered.filter(t => t.status === "OPEN").length,
            inProgress: filtered.filter(t => t.status === "IN_PROGRESS").length,
            resolved: filtered.filter(t => t.status === "RESOLVED").length,
            closed: filtered.filter(t => t.status === "CLOSED").length,
        };
    };

    const thisMonthCounts = countTickets(thisMonthStart, nextMonthStart);
    const lastMonthCounts = countTickets(lastMonthStart, thisMonthStart);

    const percentChange: StatusCounts = {
        all: lastMonthCounts.all === 0 ? 100 : ((thisMonthCounts.all - lastMonthCounts.all) / lastMonthCounts.all) * 100,
        open: lastMonthCounts.open === 0 ? 100 : ((thisMonthCounts.open - lastMonthCounts.open) / lastMonthCounts.open) * 100,
        inProgress: lastMonthCounts.inProgress === 0 ? 100 : ((thisMonthCounts.inProgress - lastMonthCounts.inProgress) / lastMonthCounts.inProgress) * 100,
        resolved: lastMonthCounts.resolved === 0 ? 100 : ((thisMonthCounts.resolved - lastMonthCounts.resolved) / lastMonthCounts.resolved) * 100,
        closed: lastMonthCounts.closed === 0 ? 100 : ((thisMonthCounts.closed - lastMonthCounts.closed) / lastMonthCounts.closed) * 100,
    };

    const trends: { [K in keyof StatusCounts]: Trend } = {
        all: getTrend(thisMonthCounts.all, lastMonthCounts.all),
        open: getTrend(thisMonthCounts.open, lastMonthCounts.open),
        inProgress: getTrend(thisMonthCounts.inProgress, lastMonthCounts.inProgress),
        resolved: getTrend(thisMonthCounts.resolved, lastMonthCounts.resolved),
        closed: getTrend(thisMonthCounts.closed, lastMonthCounts.closed),
    };

    return { thisMonth: thisMonthCounts, lastMonth: lastMonthCounts, percentChange, trends };
}

// Chart data
export type TicketTrendsData = { labels: string[]; created: number[]; resolved: number[] };
export type PriorityData = { labels: string[]; counts: number[] };

export async function getTicketChartData(days: number = 7, role?: Role, userId?: string) {
    const today = new Date();
    const lastDays = Array.from({ length: days }).map((_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (days - 1 - i));
        return d.toISOString().split("T")[0];
    });

    const createdCounts: number[] = [];
    const resolvedCounts: number[] = [];

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { departmentId: true },
    });

    const departmentId = user?.departmentId ?? undefined;

    for (const day of lastDays) {
        const created = await prisma.ticket.count({
            where: {
                createdAt: { gte: new Date(`${day}T00:00:00.000Z`), lte: new Date(`${day}T23:59:59.999Z`) },
                isArchived: false,
                ...getRoleWhere(role!, userId, departmentId),
            },
        });

        const resolved = await prisma.ticket.count({
            where: {
                status: "CLOSED",
                updatedAt: { gte: new Date(`${day}T00:00:00.000Z`), lte: new Date(`${day}T23:59:59.999Z`) },
                isArchived: false,
                ...getRoleWhere(role!, userId),
            },
        });

        createdCounts.push(created);
        resolvedCounts.push(resolved);
    }

    const trends: TicketTrendsData = {
        labels: lastDays.map(d => new Date(d).toLocaleDateString("en-US", { weekday: "short" })),
        created: createdCounts,
        resolved: resolvedCounts,
    };

    const priorities: Priority[] = [Priority.CRITICAL, Priority.MAJOR, Priority.MINOR, Priority.REQUEST];
    const priorityCounts: number[] = [];

    for (const p of priorities) {
        const count = await prisma.ticket.count({ where: { priority: p, isArchived: false, ...getRoleWhere(role!, userId, departmentId) } });
        priorityCounts.push(count);
    }

    const priority: PriorityData = { labels: ["Critical", "Major", "Minor", "Request"], counts: priorityCounts };

    return { trends, priority };
}

// Last 5 tickets
export async function getLast5Tickets(role?: Role, userId?: string): Promise<TicketWithRelations[]> {

    if (!userId) return [];

    // Fetch user's departmentId safely
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { departmentId: true },
    });

    const departmentId = user?.departmentId ?? undefined;

    return prisma.ticket.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        where: { isArchived: false, ...getRoleWhere(role!, userId, departmentId) },
        include: {
            category: { select: { id: true, name: true } },
            requester: { select: { id: true, name: true, email: true } },
            assignedTo: { select: { id: true, name: true, email: true } },
        },
    });
}

// Last 5 audits

//     // Last 5 audits
export async function getLast5Audit(): Promise<AuditWithRelations[]> {
    return prisma.audit.findMany({
        take: 5,
        orderBy: { changedAt: "desc" },
        // where: { departmentId },
        include: {
            user: { select: { id: true, name: true } },
        },
    });
}
