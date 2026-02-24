"use server";

import { getCurrentUserId } from "@/libs/action";
import { prisma } from "@/libs/prisma";
import { Priority, Prisma, Status, Ticket } from "@/generated/prisma/client";
import { z } from "zod";
import { startOfDay, endOfDay } from "date-fns";

import dayjs from 'dayjs';
// import { Priority } from "@/generated/prisma/enums";
// ======================
// Zod Schemas
// ======================
const PriorityEnum = z.enum(["REQUEST", "MINOR", "MAJOR", "CRITICAL"]);
const StatusEnum = z.enum(["NEW", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED", "CANCELED"]);







const TicketFormSchema = z.object({
    title: z.string().min(5),
    description: z.string().min(10),
    departmentId: z.string(),
    categoryId: z.string(),
    priority: PriorityEnum,
    remark: z.string().optional(),
    assignedToId: z.string().optional(),
    status: StatusEnum
});

const createFormSchema = TicketFormSchema

// Ticket list filter မှာ unknown status/priority value မဝင်အောင် enum set ကို shared validation အဖြစ်ထားပါတယ်။
const VALID_STATUS_SET = new Set<Status>(
    Object.values(Status) as Status[],
);
const VALID_PRIORITY_SET = new Set<Priority>(
    Object.values(Priority) as Priority[],
);

const ACTIVE_WORK_STATUSES: Status[] = ["OPEN", "IN_PROGRESS", "NEW" ];
const CLOSED_LIKE_STATUSES: Status[] = ["CLOSED", "RESOLVED", "CANCELED"];

// "Today" ကို Myanmar timezone (+06:30) အတိုင်းတွက်ပြီး KPI count မှာ timezone mismatch မဖြစ်အောင် helper ထည့်ထားပါတယ်။
const MYANMAR_OFFSET_MS = (6 * 60 + 30) * 60 * 1000;
const getMyanmarDayRange = (baseDate = new Date()) => {
    const shifted = new Date(baseDate.getTime() + MYANMAR_OFFSET_MS);
    const startShifted = startOfDay(shifted);
    const endShifted = endOfDay(shifted);

    return {
        start: new Date(startShifted.getTime() - MYANMAR_OFFSET_MS),
        end: new Date(endShifted.getTime() - MYANMAR_OFFSET_MS),
    };
};

// const updateFormSchema = TicketFormSchema.partial(); // allow partial update

// ======================
// Types
// ======================
export type SingleTicket = {
    id: string;
    ticketId: string
    title: string;
    description: string;
    departmentId: string | null;
    categoryId: string | null;
    priority: Priority | null;
    images: {
        id: string;
        url: string;
    }[];
    status: Status
    assignedToId: string | null
}


async function generateTicketId(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear(); // 2025
    const month = (now.getMonth() + 1).toString().padStart(2, '0'); // 08

    // ယခုလအတွင်းရှိ ticket အရေအတွက် ရှာမယ် (year + month တူတဲ့ ticket များ)
    const count = await prisma.ticket.count({
        where: {
            createdAt: {
                gte: new Date(year, now.getMonth(), 1), // ဒီလ ၁ ရက် ၀းစ
                lt: new Date(year, now.getMonth() + 1, 1), // နောက်လ ၁ ရက် ၀းစ (exclusive)
            },
        },
    });

    // count က ယခင် ticket အရေအတွက်ဖြစ်ပြီး၊ ဒီ ticket အတွက် ၁ ပေါင်းမယ်
    const ticketNumber = (count + 1).toString().padStart(3, '0'); // 001, 002, ...

    const ticketId = `TKT-${year}-${month}-${ticketNumber}`;
    return ticketId;
}


// ======================
// Create Ticket
// ======================
export async function createTicket(formData: FormData) {
    // Parse and trim input
    const raw = {
        title: formData.get("title")?.toString() ?? "",
        description: formData.get("description")?.toString() ?? "",
        departmentId: formData.get("departmentId")?.toString().trim() || undefined,
        categoryId: formData.get("categoryId")?.toString().trim() || undefined,
        priority: (formData.get("priority")?.toString() as Priority) || undefined,
        assignedToId: formData.get("assignedToId")?.toString(),
        status: (formData.get("status")) || "NEW"
    };

    // Validate using Zod
    const parsed = createFormSchema.parse(raw);

    const userId = await getCurrentUserId();
    if (!userId) throw new Error("Unauthorized");

    // Validate categoryId exists (if provided)
    if (parsed.categoryId) {
        const categoryExists = await prisma.category.findUnique({
            where: { id: parsed.categoryId },
        });
        if (!categoryExists) {
            throw new Error("Selected category does not exist");
        }
    }

    // Validate departmentId exists (if provided)
    if (parsed.departmentId) {
        const departmentExists = await prisma.department.findUnique({
            where: { id: parsed.departmentId },
        });
        if (!departmentExists) {
            throw new Error("Selected department does not exist");
        }
    }

    // Generate ticketId
    const ticketId = await generateTicketId();

    // Parse images from JSON string
    const imagesJson = formData.get("images") as string | null;
    const images = imagesJson ? JSON.parse(imagesJson) as string[] : [];




    const priority = parsed.priority


    const sla = await prisma.sLA.findUnique({
        where: { priority },
    });

    if (!sla) throw new Error(`No SLA found for priority: ${priority}`);

    // 2. အချိန်တွေတွက်မယ်
    const now = new Date();
    const responseDue = dayjs(now).add(sla.responseTime, 'minute').toDate();
    const resolutionDue = dayjs(now).add(sla.resolutionTime, 'minute').toDate();


    // Create the ticket
    const ticket = await prisma.ticket.create({
        data: {
            slaId: sla.id,
            startSlaTime: now,
            responseDue,
            resolutionDue,
            assignedToId: parsed.assignedToId,

            ticketId,
            title: parsed.title,
            description: parsed.description,
            departmentId: parsed.departmentId,
            categoryId: parsed.categoryId,
            priority: parsed.priority as Priority,
            requesterId: userId,
        },
    });



    // Insert ticket images
    if (images.length) {
        await prisma.ticketImage.createMany({
            data: images.map((url) => ({
                ticketId: ticket.id,
                url,
            })),
        });
    }


    // Add audit log
    await prisma.audit.create({
        data: {
            entity: "Ticket",
            entityId: ticket.id,
            userId: userId,
            action: "CREATE",
        },
    });

    return ticket;
}


// ======================
// Update Ticket
// ======================
export async function updateTicket(ticketId: string, formData: FormData) {
    const raw = {
        title: formData.get("title")?.toString(),
        description: formData.get("description")?.toString(),
        departmentId: formData.get("departmentId")?.toString() || undefined,
        categoryId: formData.get("categoryId")?.toString() || undefined,
        priority: (formData.get("priority")?.toString() as Priority) || undefined,
        remark: formData.get("remark")?.toString(),
        assignedToId: formData.get("assignedToId")?.toString(),
        status: formData.get("status")
    };

    // Validate input (partial allowed)
    const parsed = TicketFormSchema.parse(raw);


    // Build update data
    const updateData: {
        title: string
        description: string
        departmentId: string
        categoryId: string
        priority: string
        remark: string
        assignedToId: string
        status: Status

    } = {
        title: parsed.title,
        description: parsed.description,
        departmentId: parsed.departmentId,
        categoryId: parsed.categoryId,
        priority: parsed.priority,
        remark: parsed.remark || "",
        assignedToId: parsed.assignedToId || "",
        status: parsed.status

    };

    const oldData = await prisma.ticket.findFirst({
        where: { id: ticketId, }, include: {
            department: {
                select: { id: true, name: true }
            },

            category: {
                select: {
                    id: true,
                    name: true,
                },
            }
            ,
            assignedTo: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },


    })


    if (!oldData) throw new Error("Ticket not found");

    const currentUserId = await getCurrentUserId()

    if (!currentUserId) throw new Error("Ticket not found");


    // 4. formData ထဲက images ကို parse လုပ်မယ်  
    // formData.get("existingImageIds") မှာ ကျန်ရှိနေတဲ့ image တွေရဲ့ id တွေ JSON string အဖြစ် ရှိတယ်လို့ယူထားတယ်
    const existingImageIds = JSON.parse(formData.get("existingImageIds") as string || "[]") as string[];

    // formData.get("newImages") မှာ အသစ် upload လုပ်ထားတဲ့ images URL တွေ JSON string အဖြစ် ရှိတယ်လို့ယူထားတယ်
    const newImageUrls = JSON.parse(formData.get("newImages") as string || "[]") as string[];



    // 5. DB ထဲက ticketImage table မှာ အခု ticket နဲ့ ဆက်နွယ်ပြီး ကျန်ရှိတဲ့ image id တွေကို ရှာထုတ်မယ်
    const imagesInDb = await prisma.ticketImage.findMany({
        where: { ticketId },
        select: { id: true },
    });
    const imagesInDbIds = imagesInDb.map(img => img.id);

    // 6. existingImageIds ထဲ မပါတဲ့ DB ရဲ့ image ids ကို filter လုပ်ပြီး ဖျက်ရန် id များကို ရှာမယ်
    const idsToDelete = imagesInDbIds.filter(dbId => !existingImageIds.includes(dbId));

    if (idsToDelete.length > 0) {
        await prisma.ticketImage.deleteMany({
            where: {
                id: { in: idsToDelete },
            }
        });
    }

    // 7. အသစ် upload လုပ်ထားတဲ့ images URL တွေကို ticketImage table ထဲသို့ထည့်မယ်
    if (newImageUrls.length) {
        const newImagesData = newImageUrls.map(url => ({ ticketId, url }));
        await prisma.ticketImage.createMany({ data: newImagesData });
    }


    const priority = parsed.priority


    const sla = await prisma.sLA.findUnique({
        where: { priority },
    });

    if (!sla) throw new Error(`No SLA found for priority: ${priority}`);

    // 2. အချိန်တွေတွက်မယ်
    const responseDue = dayjs(oldData.startSlaTime).add(sla.responseTime, 'minute').toDate();
    const resolutionDue = dayjs(oldData.startSlaTime).add(sla.resolutionTime, 'minute').toDate();





    const updated = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
            ...parsed,
            slaId: sla.id, // update SLA
            responseDue,
            resolutionDue
        },
        include: {
            department: {
                select: {
                    id: true,
                    name: true,
                }
            },
            category: {
                select: {
                    id: true,
                    name: true,
                },
            },
            assignedTo: {
                select: {
                    id: true,
                    name: true,
                },
            },
        }
    });





    // Collect changes first
    const changedFields: Array<keyof typeof updateData> = [
        "title", "description", "departmentId", "categoryId", "priority", "remark", "assignedToId", "status"
    ];

    const changes: { field: string; oldValue: string; newValue: string }[] = [];

    for (const field of changedFields) {
        let oldValue = "";
        let newValue = "";

        if (field === "departmentId") {
            oldValue = oldData?.department?.name ?? "";
            newValue = updated.department?.name ?? "";
        } else if (field === "categoryId") {
            oldValue = oldData?.category?.name ?? "";
            newValue = updated.category?.name ?? "";
        } else if (field === "assignedToId") {
            oldValue = oldData?.assignedTo?.name ?? "";
            newValue = updated.assignedTo?.name ?? "";
        } else {
            oldValue = String(oldData[field] ?? "");
            newValue = String(updateData[field] ?? "");
        }

        if (oldValue !== newValue) {
            changes.push({ field, oldValue, newValue });
        }
    }

    // Save a single audit row
    if (changes.length > 0) {
        await prisma.audit.create({
            data: {
                entity: "Ticket",
                entityId: updated.id,
                userId: currentUserId,
                action: "UPDATE",
                changes: changes
                // changes: changes as unknown as Prisma.JsonValue, // ✅ Type assertion
            },
        });
    }


    return updated;
}

// ======================
// Get Single Ticket
// ======================




export async function getSingleTicket(id: string): Promise<SingleTicket | null> {
    return prisma.ticket.findFirst({
        where: { id },
        select: {
            id: true,
            ticketId: true,
            title: true,
            description: true,
            departmentId: true,
            categoryId: true,
            priority: true,
            status: true,
            requesterId: true,
            assignedToId: true,
            resolutionDue: true,
            responseDue: true,

            // status : true,

            images: {
                select: {
                    id: true,
                    url: true,
                },
            },
        },
    });
}


// ======================
// Get All Tickets 
// ======================


export type TicketWithRelations = Ticket & {
    requester?: { name: string; email: string } | null;
    assignedTo?: { name: string; email: string } | null;
    department: { id: string; name: string } | null;

};

export interface GetTicketsOptions {
    search?: Record<string, string[]>; // Column-based search
    filters?: Record<string, string[]>; // Predefined filters
    page?: number;       // current page number
    pageSize?: number;   // number of tickets per page
}

export async function getAllTickets(
    options?: GetTicketsOptions
): Promise<{ tickets: TicketWithRelations[]; total: number }> {
    const { search, filters, page = 1, pageSize = 20 } = options ?? {};
    // Default အဖြစ် archived ticket မပါစေချင်လို့ unarchived only condition နဲ့စပါတယ်။
    const where: Prisma.TicketWhereInput = { isArchived: false };
    const currentUserId = await getCurrentUserId();

    // ---- Column-based search (selectedSearchQueryFilters) ----


    // for (const value of values) {     
    //   // code
    // }


    if (search) {
        const orArray: Prisma.TicketWhereInput[] = [];

        // Object.entries(search) စိုတာ  search obj ကို array ပြောင်

        const searchArray = Object.entries(search)

        for (const [columnKey, values] of searchArray) {
            for (const value of values) {
                if (!value) continue;
                const normalizedKey = columnKey.replace(/\s+/g, "").toLowerCase();

                if (normalizedKey === "ticketid") {
                    orArray.push({ ticketId: { contains: value, mode: "insensitive" } });
                    continue;
                }

                if (normalizedKey === "title") {
                    orArray.push({ title: { contains: value, mode: "insensitive" } });
                    continue;
                }

                if (normalizedKey === "description") {
                    orArray.push({ description: { contains: value, mode: "insensitive" } });
                    continue;
                }

                if (normalizedKey === "requester") {
                    orArray.push({ requester: { name: { contains: value, mode: "insensitive" } } });
                    continue;
                }

                if (normalizedKey === "assignedto") {
                    orArray.push({ assignedTo: { name: { contains: value, mode: "insensitive" } } });
                    continue;
                }

                if (normalizedKey === "department") {
                    orArray.push({ department: { name: { contains: value, mode: "insensitive" } } });
                    continue;
                }

                if (normalizedKey === "departmentid") {
                    orArray.push({ departmentId: value });
                }
            }
        }

        if (orArray.length) {
            const currentAND =
                Array.isArray(where.AND) ?

                    where.AND :

                    (where.AND ? [where.AND] : []);

            where.AND = [...currentAND, { OR: orArray }];
        }
    }

    // ---- Predefined filters (selectedFilters) ----
    if (filters) {
        for (const [group, values] of Object.entries(filters)) {
            if (!values.length) continue;

            if (group === "Status") {
                // Invalid status value (ဥပမာ URGENT) ပါလာရင် Prisma error မဖြစ်စေဖို့ enum validation လုပ်ထားပါတယ်။
                const statusValues = values.filter((item): item is Status =>
                    VALID_STATUS_SET.has(item as Status),
                );
                if (statusValues.length) {
                    where.status = { in: statusValues };
                }
            }

            if (group === "Priority") {
                const priorityValues = values.filter((item): item is Priority =>
                    VALID_PRIORITY_SET.has(item as Priority),
                );
                if (priorityValues.length) {
                    where.priority = { in: priorityValues };
                }
            }

            if (group === "SLA") {
                const slaArray: Prisma.TicketWhereInput[] = [];
                if (values.includes("Violated")) slaArray.push({ isSlaViolated: true });
                if (values.includes("Not Violated")) slaArray.push({ isSlaViolated: false });
                if (slaArray.length) {
                    const currentAND = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
                    where.AND = [...currentAND, { OR: slaArray }];
                }
            }

            if (group === "Ownership" && currentUserId) {
                const ownershipArray: Prisma.TicketWhereInput[] = [];
                if (values.includes("Unassigned")) ownershipArray.push({ assignedToId: null });
                if (values.includes("My Tickets")) ownershipArray.push({ requesterId: currentUserId });
                if (values.includes("Assigned To Me")) ownershipArray.push({ assignedToId: currentUserId });
                if (values.includes("Followed")) {
                    ownershipArray.push({
                        views: { some: { userId: currentUserId } },
                    });
                }
                if (ownershipArray.length) {
                    const currentAND = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
                    where.AND = [...currentAND, { OR: ownershipArray }];
                }
            }

            if (group === "Archived") {
                const hasArchived = values.includes("Archived");
                const hasUnArchived = values.includes("UnArchived");

                // Archived/UnArchived နှစ်ခုလုံးရွေးထားရင် all ကိုပြမယ်၊ တစ်ခုတည်းရွေးထားရင် အဲဒီ condition ကိုသတ်မှတ်မယ်။
                if (hasArchived && !hasUnArchived) {
                    where.isArchived = true;
                } else if (hasUnArchived && !hasArchived) {
                    where.isArchived = false;
                } else if (hasArchived && hasUnArchived) {
                    delete where.isArchived;
                }
            }
        }
    }

    // Optional: delete tickets older than 3 months
    // const threeMonthsAgo = new Date();
    // threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    // await prisma.ticket.deleteMany({ where: { createdAt: { lt: threeMonthsAgo } } });

    // --- count total tickets for pagination ---
    const total = await prisma.ticket.count({ where });




    // --- fetch tickets with skip & take ---
    const tickets = await prisma.ticket.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
            requester: { select: { name: true, email: true } },
            assignedTo: { select: { name: true, email: true } },
            department: { select: { id: true, name: true } },
        },
    });

    return { tickets, total };
}



// ======================
// Get MY Tickets Count
// ======================
export async function getMyTickets() {
    const userId = await getCurrentUserId();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    const [request, minor, major, critical] = await Promise.all([
        prisma.ticket.count({
            where: {
                assignedToId: userId,
                priority: "REQUEST",
                isArchived: false,
                status: { in: ACTIVE_WORK_STATUSES },
            }
        }),
        prisma.ticket.count({
            where: {
                assignedToId: userId,
                priority: "MINOR",
                isArchived: false,
                status: { in: ACTIVE_WORK_STATUSES },
            }
        }),
        prisma.ticket.count({
            where: {
                assignedToId: userId,
                priority: "MAJOR",
                isArchived: false,
                status: { in: ACTIVE_WORK_STATUSES },
            }
        }),
        prisma.ticket.count({
            where: {
                assignedToId: userId,
                priority: "CRITICAL",
                isArchived: false,
                status: { in: ACTIVE_WORK_STATUSES },
            }
        })
    ]);


    const { start: todayStart, end: todayEnd } = getMyanmarDayRange();

    const [closedCount, slaSuccess, slaFail] = await Promise.all([
        prisma.ticket.count({
            where: {
                assignedToId: userId,
                isArchived: false,
                status: { in: CLOSED_LIKE_STATUSES },
                updatedAt: { gte: todayStart, lte: todayEnd },
            },
        }),
        prisma.ticket.count({
            where: {
                assignedToId: userId,
                isArchived: false,
                status: { in: CLOSED_LIKE_STATUSES },
                updatedAt: { gte: todayStart, lte: todayEnd },
                isSlaViolated: false,
            },
        }),
        prisma.ticket.count({
            where: {
                assignedToId: userId,
                isArchived: false,
                status: { in: CLOSED_LIKE_STATUSES },
                updatedAt: { gte: todayStart, lte: todayEnd },
                isSlaViolated: true,
            },
        }),
    ]);

    return { request, minor, major, critical, closedCount, slaSuccess, slaFail };
}



// Get audit logs for a ticket
export async function getTicketAuditLogs(ticketId: string) {
    return await prisma.audit.findMany({
        where: {
            entity: "Ticket",
            entityId: ticketId,
        },
        orderBy: { changedAt: "desc" },
        include: {
            user: { select: { name: true, email: true } },
        },
    });
}



