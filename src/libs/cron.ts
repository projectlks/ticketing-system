// import { permanentDeleteAccounts } from "@/app/main/accounts/action";
import { permanentDeleteTickets } from "@/app/main/tickets/action";
import cron from "node-cron";


cron.schedule(
    "0 17 * * *",
    async () => {
        try {
            console.log("[CRON] Deleting old tickets...");
            await permanentDeleteTickets();
            console.log("[CRON] Deleting old accounts...");
            // await permanentDeleteAccounts();
            console.log("[CRON] Cleanup done.");
        } catch (err) {
            console.error("[CRON] Cleanup failed:", err);
        }
    },
    {
        timezone: "Asia/Yangon" // Myanmar Time
    }
);
