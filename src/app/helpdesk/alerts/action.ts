"use server";

import { prisma } from "@/libs/prisma";


export async function getAllZabbixTickets() {
    try {
        const tickets = await prisma.zabbixTicket.findMany({
            orderBy: {
                eventid: "desc",
            },
        });

        return {
            success: true,
            data: tickets,
        };
    } catch (error) {
        console.error("getAllZabbixTickets error:", error);

        return {
            success: false,
            error: "Failed to fetch Zabbix tickets",
        };
    }
}