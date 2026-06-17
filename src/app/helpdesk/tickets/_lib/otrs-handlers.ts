import fs from "fs";
import path from "path";
import dayjs from "@/libs/dayjs";
import { prisma } from "@/libs/prisma";
import { OTRSAttachment, OTRSPayload, otrsService } from "@/libs/otrsService";
import { OtrsOperation, Priority, Status } from "@/generated/prisma/client";

// ==========================================
// 🌟 OTRS Handlers များအတွက် သီးသန့် Type ကြေညာခြင်း (any အသုံးမပြုပါ)
// ==========================================
export interface OtrsTicketData {
    id: string;
    ticketId: string;
    title: string;
    description: string | null;
    priority: Priority | null;
    status: Status;
    otrsTicketId: string | null;
    department?: { id: string; name: string } | null;
}

// ==========================================
// 🌟 1. Helper Function: URLs များကို Base64 OTRSAttachment အဖြစ်ပြောင်းခြင်း
// ==========================================
export async function convertToOtrsAttachments(urls: string[]): Promise<OTRSAttachment[]> {
    return await Promise.all(
        urls.map(async (url) => {
            let base64Content = "";
            if (url.startsWith("http")) {
                const fileRes = await fetch(url);
                if (fileRes.ok) {
                    const buffer = Buffer.from(await fileRes.arrayBuffer());
                    base64Content = buffer.toString("base64");
                }
            } else {
                const filename = url.split("/").pop() || "attachment";
                const folderName = filename.startsWith("img-") ? "images" : "files";
                const localFilePath = path.join(process.cwd(), "uploads", folderName, filename);
                if (fs.existsSync(localFilePath)) {
                    base64Content = fs.readFileSync(localFilePath).toString("base64");
                }
            }
            return {
                Content: base64Content,
                ContentType: url.match(/\.(png|jpg|jpeg)$/i) ? "image/png" : "application/pdf",
                Filename: url.split("/").pop() || "attachment",
            };
        })
    );
}

// ==========================================
// 🚀 2. Handle OTRS Ticket Create (Section 5.2)
// ==========================================
export async function handleOtrsTicketCreate(ticket: OtrsTicketData, images: string[]) {
    if (ticket.department?.name !== "JSC") return;

    const otrsAttachments = await convertToOtrsAttachments(images);
    const otrsPriority = ticket.priority === "CRITICAL" ? "1 Critical" :
        ticket.priority === "MAJOR" ? "2 High" :
            ticket.priority === "MINOR" ? "3 Medium" : "4 Low";

    const payload: OTRSPayload = {
        UserLogin: process.env.OTRS_USER_LOGIN || "myanmarapi",
        Password: process.env.OTRS_PASSWORD || "cQtw3qjF9Rt$_@",
        Ticket: {
            Title: ticket.title,
            QueueID: "96",
            Service: "CEIR",
            State: "new",
            Priority: otrsPriority,
            Type: "Incident",
            CustomerUser: "support@eastwindmyanmar.com.mm"
        },
        DynamicField: [{ Name: "ExternalID", Value: ticket.ticketId }],
        Article: {
            Subject: ticket.title,
            SenderType: "customer",
            From: "support@eastwindmyanmar.com.mm",
            Body: ticket.description || "",
            ContentType: "text/plain; charset=utf8",
            MimeType: "text/plain",
            Charset: "utf8",
            TimeUnit: 0,
            Attachment: otrsAttachments.length > 0 ? otrsAttachments : undefined
        }
    };

    try {
        const otrsRes = await otrsService.createTicket(payload);
        if (otrsRes.status === 200 && otrsRes.data.TicketNumber) {
            const otrsLink = `https://support.eastwind.ru/customer.pl?Action=CustomerTicketZoom;TicketNumber=${otrsRes.data.TicketNumber}`;
            await prisma.comment.create({
                data: { ticketId: ticket.id, commenterId: process.env.NEXT_PUBLIC_COMMENTER_ID || "", content: otrsLink }
            });
            await prisma.ticket.update({
                where: { id: ticket.id },
                data: { otrsTicketId: String(otrsRes.data.TicketID), otrsTicketNumber: String(otrsRes.data.TicketNumber) }
            });
        }
    } catch (error) {
        await prisma.otrsSyncQueue.create({
            data: {
                ticketId: ticket.id,
                operation: OtrsOperation.TicketCreate,
                payload: JSON.parse(JSON.stringify(payload)),
                status: "PENDING",
                retryCount: 0,
            }
        });
        console.error("[OTRS Sync]: Create Failed", error);
    }
}

// ==========================================
// 🚀 3. Handle OTRS Ticket Update (Section 5.3 & 5.4)
// ==========================================
export async function handleOtrsTicketUpdate(
    updated: OtrsTicketData,
    oldData: OtrsTicketData,
    newImageUrls: string[],
    finalAttachmentUrls: string[],
    normalizedRemark: string
) {
    const departmentChangedToJSC = oldData.department?.name !== "JSC" && updated.department?.name === "JSC";

    // -------------------------------------------------------------------------
    // အခြေအနေ (၁) - Re-assign to JSC
    // -------------------------------------------------------------------------
    if (updated.department?.name === "JSC" && updated.otrsTicketId && departmentChangedToJSC) {
        let lastLeaveDate = new Date(0);
        const jscDept = await prisma.department.findFirst({ where: { name: "JSC" } });

        if (jscDept) {
            const audits = await prisma.audit.findMany({
                where: { entity: "Ticket", entityId: updated.id, action: "UPDATE" },
                orderBy: { changedAt: "desc" }
            });

            type AuditChange = { field: string; oldValue: string; newValue: string };
            for (const audit of audits) {
                if (audit.changes && Array.isArray(audit.changes)) {
                    const deptChange = (audit.changes as unknown as AuditChange[]).find((c) => c.field === "departmentId");
                    if (deptChange && deptChange.oldValue === jscDept.id) {
                        lastLeaveDate = audit.changedAt;
                        break;
                    }
                }
            }
        }

        const periodImages = await prisma.ticketImage.findMany({
            where: { ticketId: updated.id, createdAt: { gte: lastLeaveDate } },
            orderBy: { createdAt: "asc" }
        });

        const periodComments = await prisma.comment.findMany({
            where: { ticketId: updated.id, parentId: null, createdAt: { gte: lastLeaveDate } },
            orderBy: { createdAt: "asc" },
            include: {
                commenter: { select: { name: true } },
                replies: { orderBy: { createdAt: "asc" }, include: { commenter: { select: { name: true } } } }
            }
        });

        let bodyContent = `Dear colleagues!\nTicket ${updated.ticketId} was assigned to JSC Eastwind team again.\n`;
        bodyContent += `The status of the in the EWM ticketing System is ${updated.status}.\n`;
        bodyContent += `Priority is ${updated.priority === "CRITICAL" ? "1 Critical" : updated.priority === "MAJOR" ? "2 High" : updated.priority === "MINOR" ? "3 Medium" : "4 Low"}.\n`;

        if (periodImages.length > 0) {
            bodyContent += `In the period when Ticket owner was last changed from "JSC" until last assigned to "JSC" users added attachment(s) in the EWM ticketing System into the Ticket.\nAttachments are:\n`;
            for (const img of periodImages) {
                const filename = img.url.split("/").pop() || "attachment";
                bodyContent += `${dayjs(img.createdAt).format('DD/MM/YYYY HH:mm')} ${filename}\n`;
            }
        }

        if (periodComments.length > 0) {
            bodyContent += `In the period when Ticket owner was last changed from "JSC" until last assigned to "JSC" users added new comments and replies to existing comments:\n`;
            for (const c of periodComments) {
                bodyContent += `${dayjs(c.createdAt).format('DD.MM.YYYY HH:mm')}, ${c.commenter.name}:\n${c.content || ""}\n`;
                if (c.imageUrl) {
                    const filename = c.imageUrl.split("/").pop() || "image.png";
                    bodyContent += `Attachment(s) for the comment:\n${filename}\n`;
                }
                for (const r of c.replies) {
                    bodyContent += `Replies to the comment:\n${dayjs(r.createdAt).format('DD.MM.YYYY HH:mm')}, ${r.commenter.name}:\n${r.content || ""}\n`;
                    if (r.imageUrl) {
                        const rFilename = r.imageUrl.split("/").pop() || "image.png";
                        bodyContent += `Attachment(s) for the reply:\n${rFilename}\n`;
                    }
                }
            }
        }

        const allUrlsToAttach = new Set<string>();
        periodImages.forEach(i => allUrlsToAttach.add(i.url));
        periodComments.forEach(c => {
            if (c.imageUrl) allUrlsToAttach.add(c.imageUrl);
            c.replies.forEach(r => { if (r.imageUrl) allUrlsToAttach.add(r.imageUrl); });
        });

        const otrsAttachments = await convertToOtrsAttachments(Array.from(allUrlsToAttach));

        const payload: OTRSPayload = {
            Operation: "TicketUpdate",
            UserLogin: process.env.OTRS_USER_LOGIN || "",
            Password: process.env.OTRS_PASSWORD || "",
            Ticket: { Priority: updated.priority === "CRITICAL" ? "1 Critical" : updated.priority === "MAJOR" ? "2 High" : updated.priority === "MINOR" ? "3 Medium" : "4 Low" },
            Article: {
                ArticleTypeId: 10,
                From: "support@eastwindmyanmar.com.mm",
                CommunicationChannel: "Internal",
                SenderType: "customer",
                Subject: "Ticket was assigned to JSC Eastwind team again",
                Body: bodyContent,
                ContentType: "text/plain; charset=utf8",
                MimeType: "text/plain",
                Charset: "utf8",
                TimeUnit: 0,
                Attachment: otrsAttachments.length > 0 ? otrsAttachments : undefined,
            }
        };

        try {
            await otrsService.updateTicket(updated.otrsTicketId, payload);
        } catch (error) {
            console.error("[OTRS Sync]: Re-assign Update Failed", error);
            await prisma.otrsSyncQueue.create({ data: { ticketId: updated.id, operation: OtrsOperation.TicketUpdate, payload: JSON.parse(JSON.stringify(payload)), status: "PENDING", retryCount: 0 } });
        }
    }

    // -------------------------------------------------------------------------
    // အခြေအနေ (၂) - ပုံမှန် Status, Priority ပြင်ဆင်ခြင်း
    // -------------------------------------------------------------------------
    else if (updated.department?.name === "JSC" && updated.otrsTicketId && !departmentChangedToJSC) {
        const statusChanged = oldData.status !== updated.status;
        const priorityChanged = oldData.priority !== updated.priority;
        const attachmentsAdded = newImageUrls.length > 0;

        if (statusChanged || priorityChanged || attachmentsAdded) {
            const otrsAttachments = await convertToOtrsAttachments(newImageUrls);

            let subject = "Ticket updated";
            let bodyContent = "Dear colleagues!\n";
            const subjects: string[] = [];

            if (statusChanged) {
                subjects.push(`Status changed to ${updated.status}`);
                bodyContent += `The status of the Ticket ${updated.ticketId} in the EWM ticketing System was changed to ${updated.status}.\nStatus change remark: ${normalizedRemark || "-"}.\n`;
            }
            if (priorityChanged) {
                subjects.push(`Priority changed to ${updated.priority}`);
                bodyContent += `Priority was changed to ${updated.priority}.\nPriority change remark: ${normalizedRemark || "-"}.\n`;
            }
            if (attachmentsAdded) {
                subjects.push(`attachment(s) added`);
                bodyContent += `User added attachment(s) in the EWM ticketing System for the Ticket ${updated.ticketId}.\nAttachments are:\n${otrsAttachments.map((a) => a.Filename).join("\n")}\n`;
            }
            if (subjects.length > 0) subject = subjects.join(", ");

            const ticketBlock: Record<string, string> = {};
            if (statusChanged) {
                ticketBlock.State = updated.status === "RESOLVED" || updated.status === "CLOSED" ? "closed successful" : updated.status === "CANCELED" ? "closed unsuccessful" : updated.status === "NEW" ? "new" : "open";
            }
            if (priorityChanged) {
                ticketBlock.Priority = updated.priority === "CRITICAL" ? "1 Critical" : updated.priority === "MAJOR" ? "2 High" : updated.priority === "MINOR" ? "3 Medium" : "4 Low";
            }

            const payload: OTRSPayload = {
                Operation: "TicketUpdate",
                UserLogin: process.env.OTRS_USER_LOGIN || "",
                Password: process.env.OTRS_PASSWORD || "",
                ...(Object.keys(ticketBlock).length > 0 && { Ticket: ticketBlock }),
                Article: {
                    ArticleTypeId: 10,
                    From: "support@eastwindmyanmar.com.mm",
                    CommunicationChannel: "Internal",
                    SenderType: "customer",
                    Subject: subject,
                    Body: bodyContent,
                    ContentType: "text/plain; charset=utf8",
                    MimeType: "text/plain",
                    Charset: "utf8",
                    TimeUnit: 0,
                    Attachment: otrsAttachments.length > 0 ? otrsAttachments : undefined,
                },
            };

            try {
                await otrsService.updateTicket(updated.otrsTicketId, payload);
            } catch (error) {
                console.error("[OTRS Sync]: Update Failed", error);
                await prisma.otrsSyncQueue.create({ data: { ticketId: updated.id, operation: OtrsOperation.TicketUpdate, payload: JSON.parse(JSON.stringify(payload)), status: "PENDING", retryCount: 0 } });
            }
        }
    }

    // -------------------------------------------------------------------------
    // အခြေအနေ (၃) - ပထမဆုံးအကြိမ် Assign ချခြင်း
    // -------------------------------------------------------------------------
    else if (updated.department?.name === "JSC" && !updated.otrsTicketId) {
        const otrsAttachments = await convertToOtrsAttachments(finalAttachmentUrls);
        const otrsPriority = updated.priority === "CRITICAL" ? "1 Critical" : updated.priority === "MAJOR" ? "2 High" : updated.priority === "MINOR" ? "3 Medium" : "4 Low";

        const payload: OTRSPayload = {
            UserLogin: process.env.OTRS_USER_LOGIN || "myanmarapi",
            Password: process.env.OTRS_PASSWORD || "cQtw3qjF9Rt$_@",
            Ticket: {
                Title: updated.title,
                QueueID: "96",
                Service: "CEIR",
                State: "new",
                Priority: otrsPriority,
                Type: "Incident",
                CustomerUser: "support@eastwindmyanmar.com.mm"
            },
            DynamicField: [{ Name: "ExternalID", Value: updated.ticketId }],
            Article: {
                Subject: updated.title,
                SenderType: "customer",
                From: "support@eastwindmyanmar.com.mm",
                Body: updated.description || "",
                ContentType: "text/plain; charset=utf8",
                MimeType: "text/plain",
                Charset: "utf8",
                TimeUnit: 0,
                Attachment: otrsAttachments.length > 0 ? otrsAttachments : undefined
            }
        };

        try {
            const otrsRes = await otrsService.createTicket(payload);
            if (otrsRes.status === 200 && otrsRes.data.TicketNumber) {
                const otrsLink = `https://support.eastwind.ru/customer.pl?Action=CustomerTicketZoom;TicketNumber=${otrsRes.data.TicketNumber}`;
                await prisma.comment.create({ data: { ticketId: updated.id, commenterId: process.env.NEXT_PUBLIC_COMMENTER_ID || "", content: otrsLink } });
                await prisma.ticket.update({ where: { id: updated.id }, data: { otrsTicketId: String(otrsRes.data.TicketID), otrsTicketNumber: String(otrsRes.data.TicketNumber) } });
            }
        } catch (error) {
            console.error("[OTRS Sync]: Create via Update Failed", error);
            await prisma.otrsSyncQueue.create({ data: { ticketId: updated.id, operation: OtrsOperation.TicketCreate, payload: JSON.parse(JSON.stringify(payload)), status: "PENDING", retryCount: 0 } });
        }
    }
}

// ==========================================
// 🚀 4. Handle OTRS Ticket Status Update Only
// ==========================================
export async function handleOtrsTicketStatusUpdate(updated: OtrsTicketData, oldData: OtrsTicketData) {
    if (updated.department?.name === "JSC" && updated.otrsTicketId && oldData.status !== updated.status) {
        const otrsState = updated.status === "RESOLVED" || updated.status === "CLOSED" ? "closed successful" :
            updated.status === "CANCELED" ? "closed unsuccessful" :
                updated.status === "NEW" ? "new" : "open";

        const payload: OTRSPayload = {
            Operation: "TicketUpdate",
            UserLogin: process.env.OTRS_USER_LOGIN || "",
            Password: process.env.OTRS_PASSWORD || "",
            Ticket: { State: otrsState },
            Article: {
                ArticleTypeId: 10,
                From: "support@eastwindmyanmar.com.mm",
                CommunicationChannel: "Internal",
                SenderType: "customer",
                Subject: `Status of the Ticket in the EWM ticketing System was changed to ${updated.status}`,
                Body: `Dear colleagues!\nThe status of the Ticket ${updated.ticketId} in the EWM ticketing System was changed to ${updated.status}.\nStatus change remark: Updated via Quick Action.\n`,
                ContentType: "text/plain; charset=utf8",
                MimeType: "text/plain",
                Charset: "utf8",
                TimeUnit: 0,
            },
        };

        try {
            await otrsService.updateTicket(updated.otrsTicketId, payload);
        } catch (error) {
            console.error("[OTRS Sync]: Status Update Failed", error);
            await prisma.otrsSyncQueue.create({ data: { ticketId: updated.id, operation: OtrsOperation.TicketUpdate, payload: JSON.parse(JSON.stringify(payload)), status: "PENDING", retryCount: 0 } });
        }
    }
}