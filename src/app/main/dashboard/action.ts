"use server";

import { Priority, PrismaClient } from "@prisma/client";
import { AuditWithRelations, TicketWithRelations } from "./page";
const prisma = new PrismaClient();

// Define status counts
interface StatusCounts {
    all: number;
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
}

// Trend type
type Trend = "up" | "down" | "same";

// Full monthly stats type
export interface MonthlyStats {
    thisMonth: StatusCounts;
    lastMonth: StatusCounts;
    percentChange: StatusCounts;
    trends: { [K in keyof StatusCounts]: Trend };
}

// Helper to calculate trend
const getTrend = (thisMonth: number, lastMonth: number): Trend => {
    if (thisMonth > lastMonth) return "up";
    if (thisMonth < lastMonth) return "down";
    return "same";
};

// Main function
export async function getMonthlyTicketStatsByStatus(): Promise<MonthlyStats> {
    const now = new Date();

    // Start and end of this month
    const thisMonthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    const nextMonthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1));

    // Start and end of last month
    const lastMonthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1));
    // const thisMonthIndex = now.getMonth();
    // const lastMonthIndex = thisMonthIndex - 1;

    // Fetch all tickets for last and this month
    const tickets = await prisma.ticket.findMany({
        where: {
            createdAt: {
                gte: lastMonthStart,
                lt: nextMonthStart,
            },
        },
        select: {
            status: true,
            createdAt: true,
        },
    });

    // Helper to count tickets by month and status
    const countTickets = (monthStart: Date, monthEnd: Date): StatusCounts => {
        const filtered = tickets.filter(
            (t) => t.createdAt >= monthStart && t.createdAt < monthEnd
        );

        const counts: StatusCounts = {
            all: filtered.length,
            open: filtered.filter((t) => t.status === "OPEN").length,
            inProgress: filtered.filter((t) => t.status === "IN_PROGRESS").length,
            resolved: filtered.filter((t) => t.status === "RESOLVED").length,
            closed: filtered.filter((t) => t.status === "CLOSED").length,
        };

        return counts;
    };

    const thisMonthCounts = countTickets(thisMonthStart, nextMonthStart);
    const lastMonthCounts = countTickets(lastMonthStart, thisMonthStart);

    // Percentage change
    const percentChange: StatusCounts = {
        all:
            lastMonthCounts.all === 0
                ? 100
                : ((thisMonthCounts.all - lastMonthCounts.all) / lastMonthCounts.all) * 100,
        open:
            lastMonthCounts.open === 0
                ? 100
                : ((thisMonthCounts.open - lastMonthCounts.open) / lastMonthCounts.open) * 100,
        inProgress:
            lastMonthCounts.inProgress === 0
                ? 100
                : ((thisMonthCounts.inProgress - lastMonthCounts.inProgress) / lastMonthCounts.inProgress) *
                100,
        resolved:
            lastMonthCounts.resolved === 0
                ? 100
                : ((thisMonthCounts.resolved - lastMonthCounts.resolved) / lastMonthCounts.resolved) *
                100,
        closed:
            lastMonthCounts.closed === 0
                ? 100
                : ((thisMonthCounts.closed - lastMonthCounts.closed) / lastMonthCounts.closed) * 100,
    };

    // Trends
    const trends: { [K in keyof StatusCounts]: Trend } = {
        all: getTrend(thisMonthCounts.all, lastMonthCounts.all),
        open: getTrend(thisMonthCounts.open, lastMonthCounts.open),
        inProgress: getTrend(thisMonthCounts.inProgress, lastMonthCounts.inProgress),
        resolved: getTrend(thisMonthCounts.resolved, lastMonthCounts.resolved),
        closed: getTrend(thisMonthCounts.closed, lastMonthCounts.closed),
    };

    return {
        thisMonth: thisMonthCounts,
        lastMonth: lastMonthCounts,
        percentChange,
        trends,
    };
}

// Test
getMonthlyTicketStatsByStatus()
    .then(console.log)
    .catch(console.error);



// for chartrow


export type TicketTrendsData = {
    labels: string[];
    created: number[];
    resolved: number[];
};

export type PriorityData = {
    labels: string[];
    counts: number[];
};

export async function getTicketChartData(days: number = 7) {
    const today = new Date();
    const lastDays = Array.from({ length: days }).map((_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (days - 1 - i));
        return d.toISOString().split("T")[0];
    });

    const createdCounts: number[] = [];
    const resolvedCounts: number[] = [];

    for (const day of lastDays) {
        const created = await prisma.ticket.count({
            where: {
                createdAt: {
                    gte: new Date(`${day}T00:00:00.000Z`),
                    lte: new Date(`${day}T23:59:59.999Z`),
                },
            },
        });

        const resolved = await prisma.ticket.count({
            where: {
                status: "CLOSED",
                updatedAt: {
                    gte: new Date(`${day}T00:00:00.000Z`),
                    lte: new Date(`${day}T23:59:59.999Z`),
                },
            },
        });

        createdCounts.push(created);
        resolvedCounts.push(resolved);
    }

    const trends: TicketTrendsData = {
        labels: lastDays.map((d) =>
            new Date(d).toLocaleDateString("en-US", { weekday: "short" })
        ),
        created: createdCounts,
        resolved: resolvedCounts,
    };




    const priorities: Priority[] = [Priority.URGENT, Priority.HIGH, Priority.MEDIUM, Priority.LOW];
    const priorityCounts: number[] = [];

    for (const p of priorities) {
        const count = await prisma.ticket.count({ where: { priority: p } });
        priorityCounts.push(count);
    }

    const priority: PriorityData = {
        labels: ["Urgent", "High", "Medium", "Low"],
        counts: priorityCounts,
    };

    return { trends, priority };
}




export async function getLast5Tickets(): Promise<TicketWithRelations[]> {
    const data = await prisma.ticket.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
            category: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });

    return data;
}


export async function getLast5Audit(): Promise<AuditWithRelations[]> {

    const data = await prisma.audit.findMany({
        take: 5,
        orderBy: { changedAt: "desc" },
        include: {
            user: {
                select: {
                    id: true,
                    name: true
                }
            }
        }
    })



    return data
}