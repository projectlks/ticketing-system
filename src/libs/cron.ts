import cron from "node-cron";
import dotenv from "dotenv";
import fs from "fs";
import { prisma } from "./prisma.js";
import { emitSlaViolationsChanged, emitTicketsChanged } from "./socket-emitter.js";
import { invalidateCacheByPrefixes } from "./redis-cache.js";
import { HELPDESK_CACHE_PREFIXES } from "@/app/helpdesk/cache/redis-keys";
import { OTRSPayload, otrsService } from "./otrsService.js";

// ==========================================
// 🌟 Environment Variables (ပတ်ဝန်းကျင်ဆက်တင်များ) ခေါ်ယူခြင်း
// ==========================================
// စနစ်သည် Production (အစစ်အမှန်သုံးနေသော) အခြေအနေလားဆိုတာကို စစ်ဆေးပါတယ်။
const isProduction =
    process.env.NODE_ENV === "production" ||
    (process.env.npm_lifecycle_event ?? "").startsWith("start");

// Production ဖြစ်လျှင် .env.production ဖိုင်ကိုသုံးပြီး၊ မဟုတ်လျှင် .env ဖိုင်ကို သုံးရန် သတ်မှတ်ပါသည်။
const envPath =
    isProduction && fs.existsSync(".env.production") ? ".env.production" : ".env";
dotenv.config({ path: envPath });

// ==========================================
// 🌟 HELPER FUNCTION: UI နှင့် Cache အား အလိုအလျောက် Update လုပ်ပေးရန်
// ==========================================
// ဘာကြောင့်လိုတာလဲ - Cron Job သည် နောက်ကွယ် (Background) တွင် အလုပ်လုပ်သဖြင့် OTRS အောင်မြင်/ကျရှုံးသွားပါက 
// User ၏ မျက်နှာပြင်တွင် ချက်ချင်းသိနိုင်ရန် (Refresh လုပ်စရာမလိုဘဲ ပေါ်လာစေရန်) ဤ Function ကို တည်ဆောက်ထားခြင်းဖြစ်ပါသည်။
async function notifyUiOfTicketChange(ticketId: string) {
    try {
        // Ticket ၏ နောက်ဆုံးရ Status ကို Database မှ လှမ်းယူပါမည်
        const ticket = await prisma.ticket.findUnique({
            where: { id: ticketId },
            select: { id: true, status: true }
        });
        if (ticket) {
            // ၁။ အဟောင်းဖြစ်နေသော Cache များကို ရှင်းလင်းပစ်မည် (Data အသစ်များ ဝင်လာစေရန်)
            await invalidateCacheByPrefixes([
                HELPDESK_CACHE_PREFIXES.tickets,
                HELPDESK_CACHE_PREFIXES.overview,
                HELPDESK_CACHE_PREFIXES.analysis
            ]);
            // ၂။ UI ဆီသို့ Socket လွှင့်ပေးမည် (Frontend တွင် Auto Refresh ဖြစ်သွားစေရန်)
            emitTicketsChanged({
                action: "updated",
                ticketId: ticket.id,
                status: ticket.status,
                at: new Date().toISOString(),
            });
        }
    } catch (error) {
        console.error("[CRON] Failed to notify UI of ticket change:", error);
    }
}

// ==========================================
// 🧹 2. Daily Zabbix Alerts Cleanup Job (နေ့စဉ် ရှင်းလင်းရေး)
// ==========================================
// မည်သည့်အချိန်လုပ်မည်လဲ - နေ့စဉ် မနက် ၂ နာရီခွဲတိတိ (မြန်မာစံတော်ချိန်)
// ဘာလုပ်မည်လဲ - လွန်ခဲ့သော ၁ လကျော်က ဝင်ရောက်ထားသော Zabbix Alert အဟောင်းများကို ဖျက်ပစ်ပါမည် (Database မပြည့်စေရန်)
cron.schedule("30 2 * * *", async () => {
    try {
        const now = new Date();
        const cutoff = new Date(now);
        cutoff.setMonth(cutoff.getMonth() - 1); // ယနေ့မှ ၁ လ နောက်သို့ဆုတ်မည်

        const result = await prisma.zabbixTicket.deleteMany({
            where: { clock: { lt: cutoff } }
        });

        if (result.count > 0) {
            // Alert များ ဖျက်လိုက်ပါက UI သို့ Cache ပြန်ရှင်းပေးမည်
            await invalidateCacheByPrefixes([HELPDESK_CACHE_PREFIXES.alerts]);
        }
        console.log(`[CRON] Deleted ${result.count} alerts older than 1 month.`);
    } catch (err) {
        console.log("[CRON] Alerts cleanup failed:", err);
    }
}, { timezone: "Asia/Yangon" });

// ==========================================
// 🕒 3. SLA Checking Job (SLA သတ်မှတ်ချိန် ကျော်လွန်မှု စစ်ဆေးခြင်း)
// ==========================================
// မည်သည့်အချိန်လုပ်မည်လဲ - (၁) မိနစ်ပြည့်တိုင်း အမြဲတမ်း အလုပ်လုပ်မည်
cron.schedule("*/1 * * * *", async () => {
    try {
        const now = new Date();

        // RESOLVED, CLOSED, CANCELED မဟုတ်သေးဘဲ Resolution Due (ပြီးရမည့်အချိန်) ကျော်လွန်နေသော Ticket များကို ရှာမည်
        const violatedTickets = await prisma.ticket.findMany({
            where: {
                status: { notIn: ["RESOLVED", "CLOSED", "CANCELED"] },
                resolutionDue: { lt: now },
                isSlaViolated: false, // ယခင်က SLA Violation မဖြစ်သေးသော Ticket များသာ
            },
            include: { department: true, requester: true, assignedTo: true },
        });

        // တွေ့ရှိပါက Ticket များ၏ isSlaViolated ကို true ဟု ပြောင်းပေးမည်
        for (const ticket of violatedTickets) {
            await prisma.ticket.update({ where: { id: ticket.id }, data: { isSlaViolated: true } });
        }

        // ပြောင်းလဲမှုရှိပါက UI သို့ Socket အချက်ပေးမည် (SLA အနီရောင်များ လင်းလာစေရန်)
        if (violatedTickets.length > 0) {
            emitTicketsChanged({ action: "sla-violated", count: violatedTickets.length, at: new Date().toISOString() });
            emitSlaViolationsChanged({ count: violatedTickets.length, at: new Date().toISOString() });
        }
        console.log(`[CRON] Checked ${violatedTickets.length} tickets.`);
    } catch (err) {
        console.log("[CRON] SLA check failed:", err);
    }
}, { timezone: "Asia/Yangon" });


// ==========================================
// 🚀 4. OTRS Sync Pending Retry Job (၁ မိနစ် တစ်ကြိမ်)
// ==========================================
// ဘာကြောင့်ဒီ Variable လိုအပ်သလဲ - စက္ကန့် ၆၀ အတွင်း အလုပ်မပြီးသေးခင် နောက်ထပ် ၁ မိနစ် ပြည့်သွားပါက 
// အလုပ်နှစ်ခု ထပ်ပြီး (Overlap) မလုပ်မိစေရန် ဤ Lock ကို အသုံးပြုပါသည်။
let isOtrsPendingSyncRunning = false;

cron.schedule("*/1 * * * *", async () => {
    // Lock ကျနေပါက ဤအကြိမ်ကို ကျော်သွားမည်
    if (isOtrsPendingSyncRunning) {
        console.log("[CRON] Previous 1-Min OTRS Sync is still running. Skipping this cycle.");
        return;
    }

    isOtrsPendingSyncRunning = true; // အလုပ်စတင်နေပြီဖြစ်ကြောင်း Lock ချမည်
    try {
        // PENDING ဖြစ်နေသော အလုပ် ၅ ခုကို Database မှ ယူမည်
        // orderBy: { createdAt: "asc" } ကို ဘာကြောင့်သုံးသလဲ - အစောဆုံး ဝင်လာသော TicketCreate ကို TicketUpdate ထက် အရင်အလုပ်လုပ်စေရန် ဖြစ်သည်။
        const pendingJobs = await prisma.otrsSyncQueue.findMany({
            where: { status: "PENDING", retryCount: { lt: 5 } },
            orderBy: { createdAt: "asc" },
            take: 5,
            select: { id: true, ticketId: true, payload: true, operation: true, retryCount: true, referenceType: true, referenceId: true },
        });

        for (const job of pendingJobs) {
            const payload = job.payload as unknown as OTRSPayload;
            try {
                // ----------------------------------------------------
                // [လုပ်ငန်းစဉ် - က] Ticket အသစ်ဖွင့်ခြင်း (Create)
                // ----------------------------------------------------
                if (job.operation === "TicketCreate") {
                    console.log(`[CRON] Attempting OTRS Ticket Creation for Ticket: ${job.ticketId}, Retry Count: ${job.retryCount + 1}`);
                    const otrsRes = await otrsService.createTicket(payload);

                    if (otrsRes.status >= 200 && otrsRes.status < 300 && otrsRes.data.TicketNumber) {
                        const otrsLink = `https://support.eastwind.ru/customer.pl?Action=CustomerTicketZoom;TicketNumber=${otrsRes.data.TicketNumber}`;

                        // အောင်မြင်ပါက Link ကို Comment တွင် ထည့်မည်၊ Ticket တွင် OTRS ID အမှန်ကို မှတ်သားမည်
                        await prisma.comment.create({ data: { ticketId: job.ticketId, commenterId: process.env.NEXT_PUBLIC_COMMENTER_ID || "", content: otrsLink } });
                        await prisma.ticket.update({ where: { id: job.ticketId }, data: { otrsTicketId: String(otrsRes.data.TicketID), otrsTicketNumber: String(otrsRes.data.TicketNumber) } });
                    } else {
                        throw new Error(`OTRS Create API Error: Status ${otrsRes.status}, Data: ${JSON.stringify(otrsRes.data)}`);
                    }

                    // ----------------------------------------------------
                    // [လုပ်ငန်းစဉ် - ခ] Ticket အချက်အလက် ပြင်ဆင်ခြင်း (Update)
                    // ----------------------------------------------------
                } else if (job.operation === "TicketUpdate") {
                    const currentTicket = await prisma.ticket.findUnique({ where: { id: job.ticketId }, select: { otrsTicketId: true } });

                    // ဘာကြောင့် Error Throw သလဲ - OTRS ID မရသေးပါက Create လုပ်ခြင်း မပြီးသေးသောကြောင့်ဖြစ်ပြီး၊ 
                    // အတင်းသွားပို့ပါက Error တက်မည်ဖြစ်၍ တမင်တကာ throw လိုက်ပြီး နောက်တစ်ကြိမ်များတွင်မှ ဆက်လက်စောင့်ဆိုင်းလုပ်ဆောင်ရန်ဖြစ်သည်။
                    if (!currentTicket?.otrsTicketId) {
                        throw new Error(`OTRS ID not found yet for Ticket: ${job.ticketId}. Waiting for TicketCreate to complete.`);
                    }
                    await otrsService.updateTicket(currentTicket.otrsTicketId, payload);
                }

                // လုပ်ငန်းစဉ် အောင်မြင်သွားပါက Queue ထဲတွင် COMPLETED ဟု ပြောင်းမည်
                await prisma.otrsSyncQueue.update({ where: { id: job.id }, data: { status: "COMPLETED" } });

                // UI တွင် အစိမ်းရောင် အမှန်ခြစ် (SUCCESS) ပေါ်လာစေရန် Audit သို့မဟုတ် Comment ၏ Status ကို ပြောင်းမည်
                if (job.referenceType === "AUDIT" && typeof job.referenceId === "string") {
                    await prisma.audit.update({ where: { id: job.referenceId }, data: { syncState: { otrs: "SUCCESS" } } });
                } else if (job.referenceType === "COMMENT" && typeof job.referenceId === "string") {
                    await prisma.comment.update({ where: { id: job.referenceId }, data: { syncState: { otrs: "SUCCESS" } } });
                }

                // 🌟 SUCCESS ဖြစ်သွားကြောင်း UI နှင့် Cache ကို ချက်ချင်း အသိပေးမည်
                await notifyUiOfTicketChange(job.ticketId);
                console.log(`[CRON] OTRS Sync Success for Ticket: ${job.ticketId}`);

            } catch (error) {
                console.error(`[CRON] OTRS Sync Error for Ticket: ${job.ticketId}, Retry Count: ${job.retryCount + 1}`, error);
                const newRetryCount = job.retryCount + 1;

                // ----------------------------------------------------
                // [လုပ်ငန်းစဉ် - ဂ] ၅ ကြိမ်တိုင်တိုင် ကျရှုံးပါက (FAIL Block)
                // ----------------------------------------------------
                if (newRetryCount >= 5) {
                    // လုံးဝ ကျရှုံးသွားကြောင်း FAILED အဖြစ် သတ်မှတ်မည်
                    await prisma.otrsSyncQueue.update({ where: { id: job.id }, data: { status: "FAILED", retryCount: newRetryCount } });

                    const systemCommenterId = process.env.NEXT_PUBLIC_COMMENTER_ID;
                    if (systemCommenterId) {
                        try {
                            // 🌟 [TRAP 2 FIX]: Nested Try/Catch ထည့်ထားခြင်းဖြင့် Prisma Error တက်လျှင်ပင် Cron ရပ်မသွားအောင် ကာကွယ်ထားပါသည်
                            if (job.operation === "TicketCreate") {
                                await prisma.comment.create({ data: { ticketId: job.ticketId, commenterId: systemCommenterId, content: "⚠️ OTRS Ticket creation failed after 5 retries." } });
                            }
                        } catch (commentErr) {
                            console.error("[CRON] Failed to write failure comment (Check NEXT_PUBLIC_COMMENTER_ID):", commentErr);
                        }
                    }

                    if (job.operation === "TicketUpdate") {
                        // Update ကျရှုံးပါက UI တွင် အနီရောင် (FAILED) Alert ပေါ်လာစေရန် Audit တွင် ပြင်ဆင်မည်
                        if (job.referenceType === "AUDIT" && typeof job.referenceId === "string") {
                            await prisma.audit.update({ where: { id: job.referenceId }, data: { syncState: { otrs: "FAILED" } } });
                        } else if (job.referenceType === "COMMENT" && typeof job.referenceId === "string") {
                            await prisma.comment.update({ where: { id: job.referenceId }, data: { syncState: { otrs: "FAILED" } } });
                        }
                    }


                    // 🌟 FAILED ဖြစ်သွားကြောင်းကိုလည်း UI သို့ ချက်ချင်း အသိပေးမည် (User များ အလွယ်တကူ သိနိုင်စေရန်)
                    await notifyUiOfTicketChange(job.ticketId);
                    console.log(`[CRON] OTRS Sync FAILED after 5 retries for Ticket: ${job.ticketId}`);
                } else {
                    // ၅ ကြိမ် မပြည့်သေးပါက Retry ကြိမ်အရေအတွက်ကိုသာ တိုး၍ PENDING အဖြစ် ဆက်ထားမည်
                    await prisma.otrsSyncQueue.update({ where: { id: job.id }, data: { retryCount: newRetryCount } });
                }
            }
        }
        if (pendingJobs.length > 0) { console.log(`[CRON] OTRS Sync Processed ${pendingJobs.length} jobs.`); }
    } catch (err) {
        console.log("[CRON] OTRS Sync check failed:", err);
    } finally {
        isOtrsPendingSyncRunning = false; // အလုပ်ပြီးဆုံးပါက နောက်တစ်ကြိမ် လည်ပတ်နိုင်ရန် Lock ပြန်ဖွင့်ပေးမည်
    }
}, { timezone: "Asia/Yangon" });


// ==========================================
// 🚀 5. OTRS Sync Failed Retry Job (၁၀ မိနစ် တစ်ကြိမ်)
// ==========================================
let isOtrsFailedSyncRunning = false;

// ဘာကြောင့်ဒီ Cron လိုအပ်သလဲ - ၅ ကြိမ်လုံးလုံး ပို့မရလို့ FAILED ဖြစ်သွားပြီး လက်လျှော့ထားသော အလုပ်များကို
// ၁၀ မိနစ် တစ်ခါ စနစ်ကနေ အလိုအလျောက် ပြန်လည် စမ်းသပ်ပေးရန် ဖြစ်ပါသည်။
cron.schedule("*/10 * * * *", async () => {
    if (isOtrsFailedSyncRunning) {
        console.log("[CRON] Previous 10-Min OTRS Sync is still running. Skipping this cycle.");
        return;
    }

    isOtrsFailedSyncRunning = true;
    try {
        const failedJobs = await prisma.otrsSyncQueue.findMany({
            where: { status: "FAILED" }, // FAILED ဖြစ်နေသော အလုပ်များကိုသာ ဆွဲထုတ်မည်
            orderBy: { createdAt: "asc" },
            take: 5,
            select: { id: true, ticketId: true, payload: true, operation: true, retryCount: true, referenceType: true, referenceId: true },
        });

        for (const job of failedJobs) {
            const payload = job.payload as unknown as OTRSPayload;

            try {
                console.log(`[CRON] Attempting 10-Min OTRS Sync for FAILED Ticket: ${job.ticketId}, Current Retry Count: ${job.retryCount}`);

                // (၁ မိနစ် Cron Job နှင့် Logic တူညီပါသည်)
                if (job.operation === "TicketCreate") {
                    const otrsRes = await otrsService.createTicket(payload);
                    if (otrsRes.status >= 200 && otrsRes.status < 300 && otrsRes.data.TicketNumber) {
                        const otrsLink = `https://support.eastwind.ru/customer.pl?Action=CustomerTicketZoom;TicketNumber=${otrsRes.data.TicketNumber}`;
                        await prisma.comment.create({ data: { ticketId: job.ticketId, commenterId: process.env.NEXT_PUBLIC_COMMENTER_ID || "", content: otrsLink } });
                        await prisma.ticket.update({ where: { id: job.ticketId }, data: { otrsTicketId: String(otrsRes.data.TicketID), otrsTicketNumber: String(otrsRes.data.TicketNumber) } });
                    } else {
                        throw new Error(`OTRS Ticket API Failed. Status: ${otrsRes.status}`);
                    }
                } else if (job.operation === "TicketUpdate") {
                    const currentTicket = await prisma.ticket.findUnique({ where: { id: job.ticketId }, select: { otrsTicketId: true } });
                    if (!currentTicket?.otrsTicketId) {
                        throw new Error(`OTRS ID not found yet for Ticket: ${job.ticketId}. Waiting for TicketCreate to complete.`);
                    }
                    await otrsService.updateTicket(currentTicket.otrsTicketId, payload);
                }

                // FAILED မှနေ၍ ပြန်လည် အောင်မြင်သွားပါက Status များကို အောက်ပါအတိုင်း SUCCESS သို့ ပြန်ပြောင်းပေးမည်
                await prisma.otrsSyncQueue.update({ where: { id: job.id }, data: { status: "COMPLETED" } });

                if (job.referenceType === "AUDIT" && typeof job.referenceId === "string") {
                    await prisma.audit.update({ where: { id: job.referenceId }, data: { syncState: { otrs: "SUCCESS" } } });
                } else if (job.referenceType === "COMMENT" && typeof job.referenceId === "string") {
                    await prisma.comment.update({ where: { id: job.referenceId }, data: { syncState: { otrs: "SUCCESS" } } });
                }

                // 🌟 အောင်မြင်သွားကြောင်း UI သို့ ချက်ချင်း Update လုပ်ပေးမည်
                await notifyUiOfTicketChange(job.ticketId);
                console.log(`[CRON] 10-Min OTRS Sync Success for Ticket: ${job.ticketId}`);

            } catch (error) {
                console.log(`[CRON] 10-Min OTRS Sync Error for Ticket: ${job.ticketId}`, error);

                // ၁၀ မိနစ် Cron တွင် ကျရှုံးပါက FAILED အတိုင်းသာ ဆက်ထားမည်ဖြစ်ပြီး retryCount ကိုသာ တိုးထားပါမည်။
                await prisma.otrsSyncQueue.update({ where: { id: job.id }, data: { retryCount: job.retryCount + 1 } });
            }
        }

        if (failedJobs.length > 0) { console.log(`[CRON] 10-Min OTRS Sync Processed ${failedJobs.length} failed jobs.`); }
    } catch (err) {
        console.log("[CRON] 10-Min OTRS Sync check failed:", err);
    } finally {
        isOtrsFailedSyncRunning = false; // Lock ပြန်ဖွင့်မည်
    }
}, { timezone: "Asia/Yangon" });