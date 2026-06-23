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




// 🌟 အပြင်ဘက်တွင် Lock Variable တစ်ခု ကြေညာပါ
let isOtrsPendingSyncRunning = false;

// 🕒 OTRS Sync Retry job (every 1 minute)
cron.schedule(
    "*/1 * * * *",
    async () => {
        // 🌟 အရင် အလုပ်လုပ်နေတာ မပြီးသေးရင် ဒီတစ်ခါကို ကျော်သွားမည် (Overlap မဖြစ်စေရန်)
        if (isOtrsPendingSyncRunning) {
            console.log("[CRON] Previous 1-Min OTRS Sync is still running. Skipping this cycle.");
            return;
        }

        isOtrsPendingSyncRunning = true; // Lock ချမည်
        try {
            // ၁။ PENDING ဖြစ်နေပြီး၊ Retry ၅ ကြိမ် မပြည့်သေးသော အလုပ်များကို ဆွဲထုတ်မည်
            const pendingJobs = await prisma.otrsSyncQueue.findMany({
                where: {
                    status: "PENDING",
                    retryCount: { lt: 5 },

                },
                take: 5,
                select: {
                    id: true,
                    ticketId: true,
                    payload: true,
                    operation: true,
                    retryCount: true,
                    referenceType: true,
                    referenceId: true,
                }
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

                        if (otrsRes.status >= 200 && otrsRes.status < 300 && otrsRes.data.TicketNumber) {
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
                        else {
                            // 🌟 ပြင်ဆင်ချက်: OK မဟုတ်ရင် Error Throw ပေးရပါမယ်။ ဒါမှ Catch ကိုရောက်ပါမယ်။
                            throw new Error(`OTRS Create API Error: Status ${otrsRes.status}, Data: ${JSON.stringify(otrsRes.data)}`);
                        }


                    } else if (job.operation === "TicketUpdate") {
                        // 🌟 ၁။ OTRS ID အမှန်ကို Ticket Database ထဲမှ အရင်လှမ်းယူမည်
                        const currentTicket = await prisma.ticket.findUnique({
                            where: { id: job.ticketId },
                            select: { otrsTicketId: true }
                        });

                        // 🌟 ၂။ OTRS ID မရှိသေးလျှင် Error ပစ်ပြီး နောက်မှ လုပ်ရန် စောင့်ဆိုင်းမည်
                        if (!currentTicket?.otrsTicketId) {
                            throw new Error(`OTRS ID not found yet for Ticket: ${job.ticketId}. Waiting for TicketCreate to complete.`);
                        }

                        // 🌟 ၃။ OTRS ID အမှန် (ဥပမာ - 576552) ရှိနေမှသာ OTRS သို့ Update ဆက်လုပ်မည်
                        await otrsService.updateTicket(currentTicket.otrsTicketId, payload);
                    }

                    // ၃။ အောင်မြင်သွားပါက Status ကို COMPLETED ပြောင်းမည်
                    await prisma.otrsSyncQueue.update({
                        where: { id: job.id },
                        data: { status: "COMPLETED" }
                    });

                    // 🌟 အောင်မြင်သွားပါက Audit သို့မဟုတ် Comment ၏ syncState ကိုလည်း SUCCESS ဟု ပြောင်းပေးပါမည်
                    if (job.referenceType === "AUDIT" && typeof job.referenceId === "string") {
                        await prisma.audit.update({
                            where: { id: job.referenceId },
                            data: { syncState: { otrs: "SUCCESS" } }
                        });
                    } else if (job.referenceType === "COMMENT" && typeof job.referenceId === "string") {
                        await prisma.comment.update({
                            where: { id: job.referenceId },
                            data: { syncState: { otrs: "SUCCESS" } }
                        });
                    }
                    console.log(`[CRON] OTRS Sync Success for Ticket: ${job.ticketId}`);

                } catch (error) {

                    console.error(`[CRON] OTRS Sync Error for Ticket: ${job.ticketId}, Retry Count: ${job.retryCount + 1}`, error);
                    const newRetryCount = job.retryCount + 1;

                    // ၄။ ၅ ကြိမ်မြောက်လည်း ကျရှုံးပါက (If not sent 5 times)
                    if (newRetryCount >= 2) {
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


                                if (job.referenceType === "AUDIT" && typeof job.referenceId === "string") {
                                    // 🌟 Audit ဖြစ်ခဲ့လျှင် Audit Table ကို သွားပြင်မည်
                                    await prisma.audit.update({
                                        where: { id: job.referenceId },
                                        data: { syncState: { otrs: "FAILED" } }
                                    });

                                } else if (job.referenceType === "COMMENT" && typeof job.referenceId === "string") {
                                    // 🌟 Comment ဖြစ်ခဲ့လျှင် Comment Table ကို သွားပြင်မည်
                                    await prisma.comment.update({
                                        where: { id: job.referenceId },
                                        data: { syncState: { otrs: "FAILED" } }
                                    });
                                }

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

        } finally {
            // 🌟 အလုပ်အားလုံးပြီးသွားရင် သို့မဟုတ် Error တက်ရင် Lock ပြန်ဖွင့်ပေးမည်
            isOtrsPendingSyncRunning = false;
        }
    },
    { timezone: "Asia/Yangon" }
);


// 🌟 အပြင်ဘက်တွင် Lock Variable တစ်ခု ကြေညာပါ
let isOtrsFailedSyncRunning = false;

// 🕒 10-Minute OTRS Sync Retry job (For FAILED jobs after 5 retries)
cron.schedule(
    "*/10 * * * *",
    async () => {
        if (isOtrsFailedSyncRunning) {
            console.log("[CRON] Previous 10-Min OTRS Sync is still running. Skipping this cycle.");
            return;
        }

        isOtrsFailedSyncRunning = true;
        try {
            // ၁။ FAILED ဖြစ်နေသော (၅ ကြိမ်ပြည့်သွားသော) အလုပ်များကို ဆွဲထုတ်မည်
            const failedJobs = await prisma.otrsSyncQueue.findMany({
                where: {
                    status: "FAILED",
                },
                take: 5,
                select: {
                    id: true,
                    ticketId: true,
                    payload: true,
                    operation: true,
                    retryCount: true,
                    referenceType: true,
                    referenceId: true
                }
            });

            for (const job of failedJobs) {
                // payload အား OTRSPayload Type အဖြစ် ပြောင်းလဲခြင်း
                const payload = job.payload as unknown as OTRSPayload;

                try {
                    console.log(`[CRON] Attempting 10-Min OTRS Sync for FAILED Ticket: ${job.ticketId}, Current Retry Count: ${job.retryCount}`);

                    // ၂။ OTRS သို့ ပြန်ပို့ကြည့်မည်
                    if (job.operation === "TicketCreate") {
                        const otrsRes = await otrsService.createTicket(payload);

                        if (otrsRes.status >= 200 && otrsRes.status < 300 && otrsRes.data.TicketNumber) {
                            const otrsLink = `https://support.eastwind.ru/customer.pl?Action=CustomerTicketZoom;TicketNumber=${otrsRes.data.TicketNumber}`;

                            await prisma.comment.create({
                                data: { ticketId: job.ticketId, commenterId: process.env.NEXT_PUBLIC_COMMENTER_ID || "", content: otrsLink }
                            });
                            await prisma.ticket.update({
                                where: { id: job.ticketId },
                                data: { otrsTicketId: String(otrsRes.data.TicketID), otrsTicketNumber: String(otrsRes.data.TicketNumber) }
                            });
                            
                        }
                        else {
                            throw new Error(`OTRS Ticket API Failed. Status: ${otrsRes.status}`);
                        }


                    } else if (job.operation === "TicketUpdate") {
                        // 🌟 ၁။ OTRS ID အမှန်ကို Ticket Database ထဲမှ အရင်လှမ်းယူမည်
                        const currentTicket = await prisma.ticket.findUnique({
                            where: { id: job.ticketId },
                            select: { otrsTicketId: true }
                        });

                        // 🌟 ၂။ OTRS ID မရှိသေးလျှင် Error ပစ်ပြီး နောက်မှ လုပ်ရန် စောင့်ဆိုင်းမည်
                        if (!currentTicket?.otrsTicketId) {
                            throw new Error(`OTRS ID not found yet for Ticket: ${job.ticketId}. Waiting for TicketCreate to complete.`);
                        }

                        // 🌟 ၃။ OTRS ID အမှန် (ဥပမာ - 576552) ရှိနေမှသာ OTRS သို့ Update ဆက်လုပ်မည်
                        await otrsService.updateTicket(currentTicket.otrsTicketId, payload);
                    }

                    // ၃။ အောင်မြင်သွားပါက Status ကို COMPLETED ပြောင်းမည်
                    await prisma.otrsSyncQueue.update({
                        where: { id: job.id },
                        data: { status: "COMPLETED" }
                    });

                    // 🌟 FAILED မှ ပြန်ပို့၍ အောင်မြင်သွားပါက syncState ကို SUCCESS ဟု ပြန်ပြောင်းပေးပါမည်
                    if (job.referenceType === "AUDIT" && typeof job.referenceId === "string") {
                        await prisma.audit.update({
                            where: { id: job.referenceId },
                            data: { syncState: { otrs: "SUCCESS" } }
                        });
                    } else if (job.referenceType === "COMMENT" && typeof job.referenceId === "string") {
                        await prisma.comment.update({
                            where: { id: job.referenceId },
                            data: { syncState: { otrs: "SUCCESS" } }
                        });
                    }

                    console.log(`[CRON] 10-Min OTRS Sync Success for Ticket: ${job.ticketId}`);

                } catch (error) {
                    console.log(`[CRON] 10-Min OTRS Sync Error for Ticket: ${job.ticketId}`, error);

                    // ၄။ ထပ်မံ ကျရှုံးပါက retryCount ကိုသာ တိုးထားပြီး Status ကို FAILED အတိုင်း ဆက်ထားမည် 
                    // (နောက် ၁၀ မိနစ်ပြည့်လျှင် ထပ်ပို့နိုင်ရန်)
                    await prisma.otrsSyncQueue.update({
                        where: { id: job.id },
                        data: { retryCount: job.retryCount + 1 }
                    });
                }
            }

            if (failedJobs.length > 0) {
                console.log(`[CRON] 10-Min OTRS Sync Processed ${failedJobs.length} failed jobs.`);
            }

        } catch (err) {
            console.log("[CRON] 10-Min OTRS Sync check failed:", err);

        } finally {
            isOtrsFailedSyncRunning = false; // 🌟 Lock ပြန်ဖွင့်မည်
        }
    },
    { timezone: "Asia/Yangon" }
);