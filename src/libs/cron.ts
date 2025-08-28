// import { permanentDeleteTickets } from "@/app/main/tickets/action";
import cron from "node-cron";
import { prisma } from "@/libs/prisma";
import { permanentDeleteTickets } from "@/app/lang/[locale]/main/tickets/action";
// import { permanentDeleteTickets } from "@/app/[locale]/main/tickets/action";

cron.schedule(
    "0 17 * * 0", // Sunday 5 PM Myanmar Time
    async () => {
        try {
            console.log("[CRON] Deleting old tickets...");
            await permanentDeleteTickets();

            console.log("[CRON] Deleting expired user sessions...");
            await prisma.userSession.deleteMany({
                where: { expiresAt: { lt: new Date() } }, // expired sessions only
            });

            console.log("[CRON] Cleanup done.");
        } catch (err) {
            console.error("[CRON] Cleanup failed:", err);
        }
    },
    {
        timezone: "Asia/Yangon", // Myanmar Time
    }
);
