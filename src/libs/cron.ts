import cron from "node-cron";
import dotenv from "dotenv";
import fs from "fs";
import { prisma } from "./prisma.js";
import { emitSlaViolationsChanged, emitTicketsChanged } from "./socket-emitter.js";
import { invalidateCacheByPrefixes } from "./redis-cache.js";
import { HELPDESK_CACHE_PREFIXES } from "@/app/helpdesk/cache/redis-keys";
import { OTRSPayload, otrsService } from "./otrsService.js";

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




// 🕒 OTRS Sync Retry job (every 1 minute)
cron.schedule(
    "*/1 * * * *",
    async () => {
        try {
            // ၁။ PENDING ဖြစ်နေပြီး၊ Retry ၅ ကြိမ် မပြည့်သေးသော အလုပ်များကို ဆွဲထုတ်မည်
            const pendingJobs = await prisma.otrsSyncQueue.findMany({
                where: {
                    status: "PENDING",
                    retryCount: { lt: 5 }
                },
                take: 10,
            });

            for (const job of pendingJobs) {
                // 🌟 JSON အဖြစ် သိမ်းထားသော payload ကို OTRSPayload Type အဖြစ် ပြောင်းလဲခြင်း (any မသုံးပါ)
                const payload = job.payload as unknown as OTRSPayload;
                try {

                    // ၂။ OTRS သို့ ပြန်ပို့ကြည့်မည် (Enum ဖြင့် စစ်ဆေးခြင်း)
                    if (job.operation === "TicketCreate") {

                        console.log(`[CRON] Attempting OTRS Ticket Creation for Ticket: ${job.ticketId}, Retry Count: ${job.retryCount + 1}`);

                        // await otrsService.createTicket(payload);


                        const otrsRes = await otrsService.createTicket(payload);

                        console.log(`[CRON] OTRS Response for Ticket Creation (Ticket ID: ${job.ticketId}):`, otrsRes.status, otrsRes.data);

                        if (otrsRes.status === 200 && otrsRes.data.TicketNumber) {
                            const otrsLink = `https://support.eastwind.ru/customer.pl?Action=CustomerTicketZoom;TicketNumber=${otrsRes.data.TicketNumber}`;

                            // Local DB အပ်ဒိတ်လုပ်ခြင်း
                            await prisma.comment.create({
                                data: { ticketId: job.ticketId, commenterId: process.env.NEXT_PUBLIC_COMMENTER_ID || "", content: otrsLink }
                            });
                            await prisma.ticket.update({
                                where: { id: job.ticketId },
                                data: { otrsTicketId: String(otrsRes.data.TicketID), otrsTicketNumber: String(otrsRes.data.TicketNumber) }
                            });
                        }


                    } else if (job.operation === "TicketUpdate") {
                        await otrsService.updateTicket(job.ticketId, payload);
                    }

                    // ၃။ အောင်မြင်သွားပါက Status ကို COMPLETED ပြောင်းမည်
                    await prisma.otrsSyncQueue.update({
                        where: { id: job.id },
                        data: { status: "COMPLETED" }
                    });

                    console.log(`[CRON] OTRS Sync Success for Ticket: ${job.ticketId}`);

                } catch (error) {

                    console.error(`[CRON] OTRS Sync Error for Ticket: ${job.ticketId}, Retry Count: ${job.retryCount + 1}`, error);
                    const newRetryCount = job.retryCount + 1;

                    // ၄။ ၅ ကြိမ်မြောက်လည်း ကျရှုံးပါက (If not sent 5 times)
                    if (newRetryCount >= 5) {
                        // Status ကို FAILED ပြောင်းမည်
                        await prisma.otrsSyncQueue.update({
                            where: { id: job.id },
                            data: { status: "FAILED", retryCount: newRetryCount }
                        });

                        const systemCommenterId = process.env.NEXT_PUBLIC_COMMENTER_ID || "";

                        if (systemCommenterId) {
                            if (job.operation === "TicketCreate") {

                                console.log(`[CRON] OTRS Sync FAILED after 5 retries for Ticket: ${job.ticketId}. Adding failure comment.`);

                                const a = await prisma.comment.create({
                                    data: {
                                        ticketId: job.ticketId,
                                        commenterId: systemCommenterId,
                                        content: "⚠️ OTRS Ticket creation failed after 5 retries. (OTRS သို့ Ticket အသစ်ဖွင့်ခြင်း မအောင်မြင်ပါ။)"
                                    }
                                });

                                console.log("Failure comment created:", a);
                            } else if (job.operation === "TicketUpdate") {
                                // 🌟 Payload ထဲမှ ဘာလုပ်ဆောင်ချက်လဲ ဆိုသည်ကို ဆွဲထုတ်မည် (Subject မရှိပါက Default စာသားသုံးမည်)
                                const updateAction = payload?.Article?.Subject || "Ticket modifications";

                                // 🌟 ထိုလုပ်ဆောင်ချက်အား Comment တွင် ထည့်သွင်းပြသမည်
                                await prisma.comment.create({
                                    data: {
                                        ticketId: job.ticketId,
                                        commenterId: systemCommenterId,
                                        content: `⚠️ OTRS Ticket update failed. Action: "${updateAction}". The latest changes were not synced to OTRS. (OTRS သို့ နောက်ဆုံးပြင်ဆင်ချက်များ ပို့ဆောင်ခြင်း မအောင်မြင်ပါ။)`
                                    }
                                });
                            }
                        }

                        console.log(`[CRON] OTRS Sync FAILED after 5 retries for Ticket: ${job.ticketId}`);
                    } else {
                        // ၅ ကြိမ် မပြည့်သေးပါက Retry Count သာ တိုးထားမည်
                        await prisma.otrsSyncQueue.update({
                            where: { id: job.id },
                            data: { retryCount: newRetryCount }
                        });
                    }
                }
            }

            // NextResponse အစား console.log ကိုသာ သုံးပါမည်
            if (pendingJobs.length > 0) {
                console.log(`[CRON] OTRS Sync Processed ${pendingJobs.length} jobs.`);
            }

        } catch (err) {
            console.log("[CRON] OTRS Sync check failed:", err);
        }
    },
    { timezone: "Asia/Yangon" }
);