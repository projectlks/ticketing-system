"use server";

import { getCurrentUserId } from "@/libs/action";
import { prisma } from "@/libs/prisma";
import { Priority, Prisma, Status, Ticket } from "@prisma/client";
import { z } from "zod";
import { startOfDay, endOfDay } from "date-fns";

import dayjs from 'dayjs';
// ======================
// Zod Schemas
// ======================
const PriorityEnum = z.enum(["REQUEST", "MINOR", "MAJOR", "CRITICAL"]);
const StatusEnum = z.enum(["NEW", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED", "CANCELED"]);
  
  
  
  
  
  

const TicketFormSchema = z.object({
    // id: z.string(),
    title: z.string().min(5),
    description: z.string().min(10),
    departmentId: z.string(),
    categoryId: z.string(),
    priority: PriorityEnum,
    remark: z.string().optional(),
    assignedToId: z.string().optional(),
    status : StatusEnum
});

const createFormSchema = TicketFormSchema

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
        status : (formData.get("status")) || "NEW"
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
        status : formData.get("status")
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
            changes: changes as unknown as Prisma.JsonValue, // ✅ Type assertion
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
// Get All Tickets (Optional)
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
    const where: Prisma.TicketWhereInput = {};
    const currentUserId = await getCurrentUserId();

    // ---- Column-based search (selectedSearchQueryFilters) ----
    // { 'Ticket ID': [ 's' ] }

    if (search) {
        const orArray: Prisma.TicketWhereInput[] = [];

        for (const [columnKey, values] of Object.entries(search)) {
            for (const value of values) {
                if (!value) continue;
                if (columnKey === "Ticket ID") orArray.push({ ticketId: { contains: value, mode: "insensitive" } });
                if (columnKey === "title") orArray.push({ title: { contains: value, mode: "insensitive" } });
                if (columnKey === "description") orArray.push({ description: { contains: value, mode: "insensitive" } });
                if (columnKey === "requester") orArray.push({ requester: { name: { contains: value, mode: "insensitive" } } });
                if (columnKey === "assignedTo") orArray.push({ assignedTo: { name: { contains: value, mode: "insensitive" } } });
                if (columnKey === "department") orArray.push({ department: { name: { contains: value, mode: "insensitive" } } });
            }
        }

        if (orArray.length) {
            const currentAND = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
            where.AND = [...currentAND, { OR: orArray }];
        }
    }

    // ---- Predefined filters (selectedFilters) ----
    if (filters) {
        for (const [group, values] of Object.entries(filters)) {
            if (!values.length) continue;

            if (group === "Status") where.status = { in: values as Status[] };
            if (group === "Priority") where.priority = { in: values as Priority[] };

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
                if (ownershipArray.length) {
                    const currentAND = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
                    where.AND = [...currentAND, { OR: ownershipArray }];
                }
            }
        }
    }

    // Optional: delete tickets older than 3 months
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    await prisma.ticket.deleteMany({ where: { createdAt: { lt: threeMonthsAgo } } });

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

    const [request, minor, major, critical] = await Promise.all([
        prisma.ticket.count({
            where: {
                assignedToId: userId,
                priority: "REQUEST",
                NOT: { status: { in: ["NEW", "CLOSED"] } } // exclude NEW and CLOSED
            }
        }),
        prisma.ticket.count({
            where: {
                assignedToId: userId,
                priority: "MINOR",
                NOT: { status: { in: ["NEW", "CLOSED"] } }
            }
        }),
        prisma.ticket.count({
            where: {
                assignedToId: userId,
                priority: "MAJOR",
                NOT: { status: { in: ["NEW", "CLOSED"] } }
            }
        }),
        prisma.ticket.count({
            where: {
                assignedToId: userId,
                priority: "CRITICAL",
                NOT: { status: { in: ["NEW", "CLOSED"] } }
            }
        })
    ]);


    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const [closedCount, slaSuccess, slaFail] = await Promise.all([
        prisma.ticket.count({
            where: {
                assignedToId: userId,
                status: "CLOSED",
                updatedAt: { gte: todayStart, lte: todayEnd },
            },
        }),
        prisma.ticket.count({
            where: {
                assignedToId: userId,
                status: "CLOSED",
                updatedAt: { gte: todayStart, lte: todayEnd },
                isSlaViolated: false,
            },
        }),
        prisma.ticket.count({
            where: {
                assignedToId: userId,
                status: "CLOSED",
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



