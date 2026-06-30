import cron from "node-cron";
import dotenv from "dotenv";
import fs from "fs";
import { prisma } from "./prisma.js";
import {
    emitCommentUpdated,
    emitNewComment,
    emitSlaViolationsChanged,
    emitTicketsChanged,
    emitAuditUpdated,
    AuditSocketPayload, // 🌟 ဒါလေး ထပ်တိုးပါ
} from "./socket-emitter.js";
import { invalidateCacheByPrefixes } from "./redis-cache.js";
import { HELPDESK_CACHE_PREFIXES } from "@/app/helpdesk/cache/redis-keys";
import { OTRSPayload, otrsService } from "./otrsService.js";

// ==========================================
// 🌟 Environment Variables ခေါ်ယူခြင်း
// ==========================================
const isProduction =
    process.env.NODE_ENV === "production" ||
    (process.env.npm_lifecycle_event ?? "").startsWith("start");

const envPath =
    isProduction && fs.existsSync(".env.production") ? ".env.production" : ".env";
dotenv.config({ path: envPath });

const commentRealtimeInclude = {
    commenter: {
        select: {
            id: true,
            name: true,
            email: true,
        },
    },
    replies: true,
} as const;

async function createSystemComment(data: { ticketId: string; commenterId: string; content: string }) {
    const comment = await prisma.comment.create({
        data,
        include: commentRealtimeInclude,
    });
    emitNewComment(comment);
    return comment;
}

async function updateCommentSyncState(
    commentId: string,
    syncState: { otrs: "SUCCESS" | "FAILED" },
) {
    const comment = await prisma.comment.update({
        where: { id: commentId },
        data: { syncState },
        include: commentRealtimeInclude,
    });
    emitCommentUpdated(comment);
    return comment;
}


async function updateAuditSyncState(
    auditId: string,
    syncState: { otrs: "SUCCESS" | "FAILED" },
) {
    const audit = await prisma.audit.update({
        where: { id: auditId },
        data: { syncState },
    });

    // UI မှာ ချက်ချင်း အရောင်ပြောင်းသွားစေရန် Socket လွှင့်ပေးခြင်း
    emitAuditUpdated(audit as unknown as AuditSocketPayload);
    return audit;
}
// ==========================================
// 🌟 HELPER FUNCTION: UI နှင့် Cache အား အလိုအလျောက် Update လုပ်ပေးရန်
// ==========================================
async function notifyUiOfTicketChange(ticketId: string) {
    try {
        const ticket = await prisma.ticket.findUnique({
            where: { id: ticketId },
            select: { id: true, status: true }
        });
        if (ticket) {
            await invalidateCacheByPrefixes([
                HELPDESK_CACHE_PREFIXES.tickets,
                HELPDESK_CACHE_PREFIXES.overview,
                HELPDESK_CACHE_PREFIXES.analysis
            ]);
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
// 🧹 2. Daily Zabbix Alerts Cleanup Job
// ==========================================
cron.schedule("30 2 * * *", async () => {
    try {
        const now = new Date();
        const cutoff = new Date(now);
        cutoff.setMonth(cutoff.getMonth() - 1);

        const result = await prisma.zabbixTicket.deleteMany({
            where: { clock: { lt: cutoff } }
        });

        if (result.count > 0) {
            await invalidateCacheByPrefixes([HELPDESK_CACHE_PREFIXES.alerts]);
        }
        console.log(`[CRON] Deleted ${result.count} alerts older than 1 month.`);
    } catch (err) {
        console.log("[CRON] Alerts cleanup failed:", err);
    }
}, { timezone: "Asia/Yangon" });

// ==========================================
// 🕒 3. SLA Checking Job
// ==========================================
cron.schedule("*/1 * * * *", async () => {
    try {
        const now = new Date();
        const violatedTickets = await prisma.ticket.findMany({
            where: {
                status: { notIn: ["RESOLVED", "CLOSED", "CANCELED"] },
                resolutionDue: { lt: now },
                isSlaViolated: false,
            },
            include: { department: true, requester: true, assignedTo: true },
        });

        for (const ticket of violatedTickets) {
            await prisma.ticket.update({ where: { id: ticket.id }, data: { isSlaViolated: true } });
        }

        if (violatedTickets.length > 0) {
            emitTicketsChanged({ action: "sla-violated", count: violatedTickets.length, at: new Date().toISOString() });
            emitSlaViolationsChanged({ count: violatedTickets.length, at: new Date().toISOString() });
        }
    } catch (err) {
        console.log("[CRON] SLA check failed:", err);
    }
}, { timezone: "Asia/Yangon" });

// ==========================================
// 🌟 SHARED FUNCTION: Process OTRS Job (Clean Code)
// ==========================================

// 'any' type အစား တိကျသော Type ကို သတ်မှတ်ထားပါသည်
interface QueueJob {
    id: string;
    ticketId: string;
    payload: unknown;
    operation: string;
    retryCount: number;
    referenceType: string | null;
    referenceId: string | null;
}

async function processOtrsJob(job: QueueJob) {
    const payload = job.payload as unknown as OTRSPayload;

    if (job.operation === "TicketCreate") {
        const otrsRes = await otrsService.createTicket(payload);

        if (otrsRes.status >= 200 && otrsRes.status < 300 && otrsRes.data.TicketNumber) {
            const otrsTicketIdStr = String(otrsRes.data.TicketID);
            const otrsTicketNumStr = String(otrsRes.data.TicketNumber);

            await prisma.ticket.update({
                where: { id: job.ticketId },
                data: {
                    otrsTicketId: otrsTicketIdStr,
                    otrsTicketNumber: otrsTicketNumStr
                }
            });

            if (job.referenceType === "ZABBIX" && job.referenceId) {
                await prisma.zabbixTicket.updateMany({
                    where: { eventid: job.referenceId },
                    data: { otrsTicketId: otrsTicketIdStr }
                });
            } else {
                const otrsLink = `https://support.eastwind.ru/customer.pl?Action=CustomerTicketZoom;TicketNumber=${otrsTicketNumStr}`;
                await createSystemComment({
                    ticketId: job.ticketId,
                    commenterId: process.env.NEXT_PUBLIC_COMMENTER_ID || "",
                    content: otrsLink
                });
            }
        } else {
            throw new Error(`OTRS Create API Error: Status ${otrsRes.status}, Data: ${JSON.stringify(otrsRes.data)}`);
        }
    }
    else if (job.operation === "TicketUpdate") {
        const currentTicket = await prisma.ticket.findUnique({
            where: { id: job.ticketId },
            select: { otrsTicketId: true }
        });

        if (!currentTicket?.otrsTicketId) {
            throw new Error(`OTRS ID not found yet for Ticket: ${job.ticketId}. Waiting for TicketCreate to complete.`);
        }

        const otrsRes = await otrsService.updateTicket(currentTicket.otrsTicketId, payload);
        if (otrsRes.status < 200 || otrsRes.status >= 300) {
            throw new Error(`OTRS Update API Error: Status ${otrsRes.status}, Data: ${JSON.stringify(otrsRes.data)}`);
        }
    }

    // --- ဘုံ အောင်မြင်မှု လုပ်ငန်းစဉ် (Success Flow) ---
    await prisma.otrsSyncQueue.update({
        where: { id: job.id },
        data: { status: "COMPLETED" }
    });

    if (job.referenceType === "AUDIT" && typeof job.referenceId === "string") {
        // await prisma.audit.update({
        //     where: { id: job.referenceId },
        //     data: { syncState: { otrs: "SUCCESS" } }
        // });

        await updateAuditSyncState(job.referenceId, { otrs: "SUCCESS" });
    } else if (job.referenceType === "COMMENT" && typeof job.referenceId === "string") {
        await updateCommentSyncState(job.referenceId, { otrs: "SUCCESS" });
    }

    await notifyUiOfTicketChange(job.ticketId);
}

// ==========================================
// 🚀 4. OTRS Sync Pending Retry Job (၁ မိနစ် တစ်ကြိမ်)
// ==========================================
let isOtrsPendingSyncRunning = false;

cron.schedule("*/1 * * * *", async () => {
    if (isOtrsPendingSyncRunning) {
        console.log("[CRON] Previous 1-Min OTRS Sync is still running. Skipping this cycle.");
        return;
    }

    isOtrsPendingSyncRunning = true;
    try {
        const pendingJobs = await prisma.otrsSyncQueue.findMany({
            where: { status: "PENDING", retryCount: { lt: 5 } },
            orderBy: { createdAt: "asc" },
            take: 5,
            select: { id: true, ticketId: true, payload: true, operation: true, retryCount: true, referenceType: true, referenceId: true },
        });

        for (const job of pendingJobs) {
            try {
                console.log(`[CRON] Attempting OTRS Sync for Ticket: ${job.ticketId} (Operation: ${job.operation}), Retry Count: ${job.retryCount + 1}`);

                await processOtrsJob(job);

                console.log(`[CRON] OTRS Sync Success for Ticket: ${job.ticketId} (Operation: ${job.operation})`);
            } catch (error) {
                console.error(`[CRON] OTRS Sync Error for Ticket: ${job.ticketId}, Retry Count: ${job.retryCount + 1}`, error);
                const newRetryCount = job.retryCount + 1;

                if (newRetryCount >= 5) {
                    await prisma.otrsSyncQueue.update({ where: { id: job.id }, data: { status: "FAILED", retryCount: newRetryCount } });

                    const systemCommenterId = process.env.NEXT_PUBLIC_COMMENTER_ID;
                    if (systemCommenterId) {
                        try {
                            if (job.operation === "TicketCreate") {
                                await createSystemComment({ ticketId: job.ticketId, commenterId: systemCommenterId, content: "⚠️ OTRS Ticket creation failed after 5 retries." });
                            }
                        } catch (commentErr) {
                            console.error("[CRON] Failed to write failure comment:", commentErr);
                        }
                    }

                    if (job.operation === "TicketUpdate") {
                        if (job.referenceType === "AUDIT" && typeof job.referenceId === "string") {
                            // await prisma.audit.update({ where: { id: job.referenceId }, data: { syncState: { otrs: "FAILED" } } });
                            await updateAuditSyncState(job.referenceId, { otrs: "FAILED" });
                        } else if (job.referenceType === "COMMENT" && typeof job.referenceId === "string") {
                            await updateCommentSyncState(job.referenceId, { otrs: "FAILED" });
                        }
                    }

                    await notifyUiOfTicketChange(job.ticketId);
                    console.log(`[CRON] OTRS Sync FAILED after 5 retries for Ticket: ${job.ticketId}`);
                } else {
                    await prisma.otrsSyncQueue.update({ where: { id: job.id }, data: { retryCount: newRetryCount } });
                }
            }
        }
        if (pendingJobs.length > 0) { console.log(`[CRON] OTRS Sync Processed ${pendingJobs.length} jobs.`); }
    } catch (err) {
        console.log("[CRON] OTRS Sync check failed:", err);
    } finally {
        isOtrsPendingSyncRunning = false;
    }
}, { timezone: "Asia/Yangon" });

// ==========================================
// 🚀 5. OTRS Sync Failed Retry Job (၁၀ မိနစ် တစ်ကြိမ်)
// ==========================================
let isOtrsFailedSyncRunning = false;

cron.schedule("*/10 * * * *", async () => {
    if (isOtrsFailedSyncRunning) {
        console.log("[CRON] Previous 10-Min OTRS Sync is still running. Skipping this cycle.");
        return;
    }

    isOtrsFailedSyncRunning = true;
    try {
        const failedJobs = await prisma.otrsSyncQueue.findMany({
            where: { status: "FAILED" },
            orderBy: { createdAt: "asc" },
            take: 5,
            select: { id: true, ticketId: true, payload: true, operation: true, retryCount: true, referenceType: true, referenceId: true },
        });

        for (const job of failedJobs) {
            try {
                console.log(`[CRON] Attempting 10-Min OTRS Sync for FAILED Ticket: ${job.ticketId}, Current Retry Count: ${job.retryCount}`);

                await processOtrsJob(job);

                console.log(`[CRON] 10-Min OTRS Sync Success for Ticket: ${job.ticketId} (Operation: ${job.operation})`);
            } catch (error) {
                console.log(`[CRON] 10-Min OTRS Sync Error for Ticket: ${job.ticketId}`, error);

                await prisma.otrsSyncQueue.update({ where: { id: job.id }, data: { retryCount: job.retryCount + 1 } });
                await notifyUiOfTicketChange(job.ticketId);
            }
        }

        if (failedJobs.length > 0) { console.log(`[CRON] 10-Min OTRS Sync Processed ${failedJobs.length} failed jobs.`); }
    } catch (err) {
        console.log("[CRON] 10-Min OTRS Sync check failed:", err);
    } finally {
        isOtrsFailedSyncRunning = false;
    }
}, { timezone: "Asia/Yangon" });