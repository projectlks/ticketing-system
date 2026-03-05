import cron from "node-cron";
import dotenv from "dotenv";
import { prisma } from "./prisma.js";

dotenv.config();
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
            console.error("[CRON] Cleanup failed:", err);
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

            console.log(`[CRON] Checked ${violatedTickets.length} tickets.`);
        } catch (err) {
            console.error("[CRON] SLA check failed:", err);
        }
    },
    { timezone: "Asia/Yangon" }
);