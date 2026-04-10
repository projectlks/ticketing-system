import cron from "node-cron";
import dotenv from "dotenv";
import fs from "fs";
import { prisma } from "./prisma.js";
import { emitSlaViolationsChanged, emitTicketsChanged } from "./socket-emitter.js";
import { invalidateCacheByPrefixes } from "./redis-cache.js";
import { HELPDESK_CACHE_PREFIXES } from "@/app/helpdesk/cache/redis-keys";

const isProduction =
    process.env.NODE_ENV === "production" ||
    (process.env.npm_lifecycle_event ?? "").startsWith("start");
const envPath =
    isProduction && fs.existsSync(".env.production") ? ".env.production" : ".env";
dotenv.config({ path: envPath });
// Load .env first



// 🧹 Weekly cleanup job
cron.schedule(
    "0 17 * * 0", // Sunday 5 PM Myanmar Time
    async () => {
        try {
            console.log("[CRON] Deleting old tickets...");
            // await permanentDeleteTickets();

            console.log("[CRON] Deleting expired user sessions...");


            console.log("[CRON] Cleanup done.");
        } catch (err) {
            console.log("[CRON] Cleanup failed:", err);
        }
    },
    { timezone: "Asia/Yangon" }
);

// 🧹 Daily cleanup: delete alerts older than 1 month
cron.schedule(
    "30 2 * * *", // 2:30 AM Myanmar Time
    async () => {
        try {
            const now = new Date();
            const cutoff = new Date(now);
            cutoff.setMonth(cutoff.getMonth() - 1);

            const result = await prisma.zabbixTicket.deleteMany({
                where: {
                    clock: { lt: cutoff },
                },
            });

            if (result.count > 0) {
                await invalidateCacheByPrefixes([HELPDESK_CACHE_PREFIXES.alerts]);
            }

            console.log(
                `[CRON] Deleted ${result.count} alerts older than 1 month (before ${cutoff.toISOString()}).`,
            );
        } catch (err) {
            console.log("[CRON] Alerts cleanup failed:", err);
        }
    },
    { timezone: "Asia/Yangon" }
);

// 🕒 SLA checking job (every 10 minutes)
cron.schedule(
    "*/1 * * * *",
    async () => {
        try {
            const now = new Date();


            const violatedTickets = await prisma.ticket.findMany({
                where: {
                    status: {
                        notIn: ["RESOLVED", "CLOSED", "CANCELED"

                        ]
                    },
                    resolutionDue: { lt: now },
                    isSlaViolated: false,
                },
                include: {
                    department: true,
                    requester: true,
                    assignedTo: true,
                },
            });

            for (const ticket of violatedTickets) {
                // Update SLA violation flag
                await prisma.ticket.update({
                    where: { id: ticket.id },
                    data: { isSlaViolated: true },
                });

                // console.log(`SLA violated → Ticket: ${ticket.ticketId}`);


            }

            if (violatedTickets.length > 0) {
                emitTicketsChanged({
                    action: "sla-violated",
                    count: violatedTickets.length,
                    at: new Date().toISOString(),
                });

                emitSlaViolationsChanged({
                    count: violatedTickets.length,
                    at: new Date().toISOString(),
                });
            }

            console.log(`[CRON] Checked ${violatedTickets.length} tickets.`);
        } catch (err) {
            console.log("[CRON] SLA check failed:", err);
        }
    },
    { timezone: "Asia/Yangon" }
);
