"use server";

import { getCurrentUserId } from "@/libs/action";
import { prisma } from "@/libs/prisma";
import { CreationMode, Priority, Prisma, Status, Ticket } from "@/generated/prisma/client";
import {
    getOrSetCache,
    hashKeyPayload,
    invalidateCacheByPrefixes,
} from "@/libs/redis-cache";
import { z } from "zod";
import dayjs from "@/libs/dayjs";
import {
    HELPDESK_CACHE_PREFIXES,
    HELPDESK_CACHE_TTL_SECONDS,
    helpdeskRedisKeys,
} from "../cache/redis-keys";
import { emitTicketsChanged } from "@/libs/socket-emitter";
import { requireSuperAdminAndEmail } from "@/libs/admin-guard";
import { syncTicketOutbound } from "@/libs/ticket-outbound-sync";
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
const VALID_CREATION_MODE_SET = new Set<CreationMode>(
    Object.values(CreationMode) as CreationMode[],
);

const ACTIVE_WORK_STATUSES: Status[] = ["OPEN", "IN_PROGRESS", "NEW" ];
const CLOSED_LIKE_STATUSES: Status[] = ["CLOSED", "RESOLVED", "CANCELED"];

// Empty string / "null" / "undefined" values coming from form data
// should be treated as NULL for optional foreign-key columns.
const normalizeOptionalRelationId = (
    value: string | FormDataEntryValue | null | undefined,
): string | null => {
    const normalized = (typeof value === "string" ? value : value?.toString() ?? "").trim();
    if (!normalized) return null;

    const lower = normalized.toLowerCase();
    if (lower === "null" || lower === "undefined") return null;
    return normalized;
};

const ensureAssignableUserExists = async (
    assignedToId: string | null,
): Promise<string | null> => {
    if (!assignedToId) return null;

    const assignee = await prisma.user.findFirst({
        where: {
            id: assignedToId,
            isArchived: false,
        },
        select: { id: true },
    });

    if (!assignee) {
        return "Selected assignee does not exist";
    }

    return null;
};

// "Today" ကို Myanmar timezone (+06:30) အတိုင်းတွက်ပြီး KPI count မှာ timezone mismatch မဖြစ်အောင် helper ထည့်ထားပါတယ်။
const MYANMAR_OFFSET_MS = (6 * 60 + 30) * 60 * 1000;
const getMyanmarDayRange = (baseDate = new Date()) => {
    const shifted = dayjs(baseDate.getTime() + MYANMAR_OFFSET_MS);
    const startShifted = shifted.startOf("day");
    const endShifted = shifted.endOf("day");

    return {
        start: new Date(startShifted.valueOf() - MYANMAR_OFFSET_MS),
        end: new Date(endShifted.valueOf() - MYANMAR_OFFSET_MS),
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

type UpdatedTicketWithRelations = Prisma.TicketGetPayload<{
    include: {
        department: { select: { id: true; name: true } };
        category: { select: { id: true; name: true } };
        assignedTo: { select: { id: true; name: true } };
    };
}>;

type TicketActionResult<T> = {
    data?: T;
    error?: string;
};

type TicketMutationOptions = {
    actorUserId?: string | null;
};

const toErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error) return error.message;
    if (typeof error === "string" && error.trim()) return error;
    return fallback;
};

const resolveActorUserId = async (
    actorUserId?: string | null,
): Promise<string | undefined> => {
    const normalized = actorUserId?.trim();
    if (normalized) {
        const actor = await prisma.user.findFirst({
            where: {
                id: normalized,
                isArchived: false,
            },
            select: { id: true },
        });
        return actor?.id;
    }

    return getCurrentUserId();
};


export async function generateTicketId(): Promise<string> {
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
export async function createTicket(
    formData: FormData,
    options: TicketMutationOptions = {},
): Promise<TicketActionResult<Ticket>> {
    // Parse and trim input
    const raw = {
        title: formData.get("title")?.toString() ?? "",
        description: formData.get("description")?.toString() ?? "",
        departmentId: formData.get("departmentId")?.toString().trim() || undefined,
        categoryId: formData.get("categoryId")?.toString().trim() || undefined,
        priority: (formData.get("priority")?.toString() as Priority) || undefined,
        assignedToId: formData.get("assignedToId")?.toString(),
        status: formData.get("status") || "NEW",
    };

    const parsed = createFormSchema.safeParse(raw);
    if (!parsed.success) {
        return {
            error: parsed.error.issues[0]?.message ?? "Invalid ticket data.",
        };
    }

    const normalizedAssignedToId = normalizeOptionalRelationId(
        parsed.data.assignedToId,
    );

    const userId = await resolveActorUserId(options.actorUserId);
    if (!userId) return { error: "Unauthorized" };

    if (parsed.data.categoryId) {
        const categoryExists = await prisma.category.findUnique({
            where: { id: parsed.data.categoryId, isArchived: false },
        });
        if (!categoryExists) {
            return { error: "Selected category does not exist" };
        }
    }

    if (parsed.data.departmentId) {
        const departmentExists = await prisma.department.findUnique({
            where: { id: parsed.data.departmentId, isArchived: false },
        });
        if (!departmentExists) {
            return { error: "Selected department does not exist" };
        }
    }

    const assignError = await ensureAssignableUserExists(normalizedAssignedToId);
    if (assignError) return { error: assignError };

    const ticketId = await generateTicketId();

    let images: string[] = [];
    const imagesJson = formData.get("images");
    if (typeof imagesJson === "string" && imagesJson.trim()) {
        try {
            const parsedImages = JSON.parse(imagesJson);
            if (!Array.isArray(parsedImages)) {
                return { error: "Invalid images payload." };
            }
            images = parsedImages as string[];
        } catch {
            return { error: "Invalid images payload." };
        }
    }

    const priority = parsed.data.priority;

    const sla = await prisma.sLA.findUnique({
        where: { priority },
    });

    if (!sla) return { error: `No SLA found for priority: ${priority}` };

    const now = new Date();
    const responseDue = dayjs(now).add(sla.responseTime, "minute").toDate();
    const resolutionDue = dayjs(now).add(sla.resolutionTime, "minute").toDate();

    try {
        const ticket = await prisma.ticket.create({
            data: {
                slaId: sla.id,
                startSlaTime: now,
                responseDue,
                resolutionDue,
                assignedToId: normalizedAssignedToId,
                ticketId,
                title: parsed.data.title,
                description: parsed.data.description,
                departmentId: parsed.data.departmentId,
                categoryId: parsed.data.categoryId,
                priority: parsed.data.priority as Priority,
                requesterId: userId,
            },
        });

        if (images.length) {
            await prisma.ticketImage.createMany({
                data: images.map((url) => ({
                    ticketId: ticket.id,
                    url,
                })),
            });
        }

        await prisma.audit.create({
            data: {
                entity: "Ticket",
                entityId: ticket.id,
                userId: userId,
                action: "CREATE",
            },
        });

        await invalidateCacheByPrefixes([
            HELPDESK_CACHE_PREFIXES.tickets,
            HELPDESK_CACHE_PREFIXES.overview,
            HELPDESK_CACHE_PREFIXES.departments,
            HELPDESK_CACHE_PREFIXES.analysis,
            HELPDESK_CACHE_PREFIXES.users,
        ]);

        emitTicketsChanged({
            action: "created",
            ticketId: ticket.id,
            status: ticket.status,
            at: new Date().toISOString(),
        });

        const syncResult = await syncTicketOutbound({
            event: "created",
            ticketId: ticket.id,
            ticket,
        });
        if (!syncResult.ok && !syncResult.skipped) {
            console.error("[ticket-sync] outbound create sync failed", {
                ticketId: ticket.id,
                status: syncResult.status,
                error: syncResult.error,
            });
        }

        return { data: ticket };
    } catch (error) {
        return { error: toErrorMessage(error, "Failed to create ticket.") };
    }
}

export async function updateTicket(
    ticketId: string,
    formData: FormData,
    options: TicketMutationOptions = {},
): Promise<
    TicketActionResult<{ updated: UpdatedTicketWithRelations; urlsToDelete: string[] }>
> {
    if (!ticketId) return { error: "Ticket ID is required" };

    const raw = {
        title: formData.get("title")?.toString(),
        description: formData.get("description")?.toString(),
        departmentId: formData.get("departmentId")?.toString() || undefined,
        categoryId: formData.get("categoryId")?.toString() || undefined,
        priority: (formData.get("priority")?.toString() as Priority) || undefined,
        remark: formData.get("remark")?.toString(),
        assignedToId: formData.get("assignedToId")?.toString(),
        status: formData.get("status"),
    };

    const parsed = TicketFormSchema.safeParse(raw);
    if (!parsed.success) {
        return {
            error: parsed.error.issues[0]?.message ?? "Invalid ticket data.",
        };
    }

    if (parsed.data.categoryId) {
        const categoryExists = await prisma.category.findUnique({
            where: { id: parsed.data.categoryId, isArchived: false },
        });
        if (!categoryExists) {
            return { error: "Selected category does not exist" };
        }
    }

    if (parsed.data.departmentId) {
        const departmentExists = await prisma.department.findUnique({
            where: { id: parsed.data.departmentId, isArchived: false },
        });
        if (!departmentExists) {
            return { error: "Selected department does not exist" };
        }
    }

    const normalizedAssignedToId = normalizeOptionalRelationId(parsed.data.assignedToId);
    const assignError = await ensureAssignableUserExists(normalizedAssignedToId);
    if (assignError) return { error: assignError };

    const oldData = await prisma.ticket.findFirst({
        where: { id: ticketId },
        include: {
            department: {
                select: { id: true, name: true },
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
        },
    });

    if (!oldData) return { error: "Ticket not found" };

    const currentUserId = await resolveActorUserId(options.actorUserId);
    if (!currentUserId) return { error: "Unauthorized" };

    let existingImageIds: string[] = [];
    const hasExistingImageIdsField = formData.has("existingImageIds");
    try {
        const parsedIds = JSON.parse(
            (formData.get("existingImageIds") as string) || "[]",
        );
        if (!Array.isArray(parsedIds)) {
            return { error: "Invalid existingImageIds payload." };
        }
        existingImageIds = parsedIds as string[];
    } catch {
        return { error: "Invalid existingImageIds payload." };
    }

    let newImageUrls: string[] = [];
    try {
        const parsedUrls = JSON.parse(
            (formData.get("newImages") as string) || "[]",
        );
        if (!Array.isArray(parsedUrls)) {
            return { error: "Invalid newImages payload." };
        }
        newImageUrls = parsedUrls as string[];
    } catch {
        return { error: "Invalid newImages payload." };
    }

    let deletedImageIds: string[] | null = null;
    if (formData.has("deletedImageIds")) {
        const rawDeletedIds = formData.get("deletedImageIds");
        if (typeof rawDeletedIds === "string" && rawDeletedIds.trim()) {
            try {
                const parsedDeleted = JSON.parse(rawDeletedIds);
                if (!Array.isArray(parsedDeleted)) {
                    return { error: "Invalid deletedImageIds payload." };
                }
                deletedImageIds = parsedDeleted as string[];
            } catch {
                return { error: "Invalid deletedImageIds payload." };
            }
        } else {
            deletedImageIds = [];
        }
    }

    try {
        const imagesInDb = await prisma.ticketImage.findMany({
            where: { ticketId },
            select: { id: true, url: true },
        });
        const imagesInDbIds = imagesInDb.map((img) => img.id);
        const imagesInDbIdSet = new Set(imagesInDbIds);

        let idsToDelete: string[] = [];
        if (deletedImageIds && deletedImageIds.length) {
            idsToDelete = deletedImageIds.filter((id) => imagesInDbIdSet.has(id));
        } else if (hasExistingImageIdsField) {
            idsToDelete = imagesInDbIds.filter(
                (dbId) => !existingImageIds.includes(dbId),
            );
        }

        const idsToDeleteSet = new Set(idsToDelete);
        const urlsToDelete = imagesInDb
            .filter((img) => idsToDeleteSet.has(img.id))
            .map((img) => img.url);

        if (idsToDelete.length > 0) {
            await prisma.ticketImage.deleteMany({
                where: {
                    id: { in: idsToDelete },
                },
            });
        }

        if (newImageUrls.length) {
            const newImagesData = newImageUrls.map((url) => ({ ticketId, url }));
            await prisma.ticketImage.createMany({ data: newImagesData });
        }

        const priority = parsed.data.priority;
        const sla = await prisma.sLA.findUnique({
            where: { priority },
        });

        if (!sla) return { error: `No SLA found for priority: ${priority}` };

        const rawSlaBaseTime = oldData.startSlaTime ?? oldData.createdAt;
        const slaBaseTime = Number.isNaN(rawSlaBaseTime.getTime())
            ? new Date()
            : rawSlaBaseTime;
        const responseDue = dayjs(slaBaseTime).add(sla.responseTime, "minute").toDate();
        const resolutionDue = dayjs(slaBaseTime).add(sla.resolutionTime, "minute").toDate();

        const updated = await prisma.ticket.update({
            where: { id: ticketId },
            data: {
                title: parsed.data.title,
                description: parsed.data.description,
                departmentId: parsed.data.departmentId,
                categoryId: parsed.data.categoryId,
                priority: parsed.data.priority,
                remark: parsed.data.remark || "",
                assignedToId: normalizedAssignedToId,
                status: parsed.data.status,
                slaId: sla.id,
                startSlaTime: slaBaseTime,
                responseDue,
                resolutionDue,
            },
            include: {
                department: {
                    select: {
                        id: true,
                        name: true,
                    },
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
            },
        });

        const changedFields: Array<keyof typeof raw> = [
            "title",
            "description",
            "departmentId",
            "categoryId",
            "priority",
            "remark",
            "assignedToId",
            "status",
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
                oldValue = String((oldData as Record<string, unknown>)[field] ?? "");
                newValue = String((parsed.data as Record<string, unknown>)[field] ?? "");
            }

            if (oldValue !== newValue) {
                changes.push({ field, oldValue, newValue });
            }
        }

        if (changes.length > 0) {
            await prisma.audit.create({
                data: {
                    entity: "Ticket",
                    entityId: updated.id,
                    userId: currentUserId,
                    action: "UPDATE",
                    changes: changes,
                },
            });
        }

        await invalidateCacheByPrefixes([
            HELPDESK_CACHE_PREFIXES.tickets,
            HELPDESK_CACHE_PREFIXES.overview,
            HELPDESK_CACHE_PREFIXES.departments,
            HELPDESK_CACHE_PREFIXES.analysis,
            HELPDESK_CACHE_PREFIXES.users,
        ]);

        emitTicketsChanged({
            action: "updated",
            ticketId: updated.id,
            status: updated.status,
            at: new Date().toISOString(),
        });

        const syncResult = await syncTicketOutbound({
            event: "updated",
            ticketId: updated.id,
            ticket: updated,
        });
        if (!syncResult.ok && !syncResult.skipped) {
            console.error("[ticket-sync] outbound update sync failed", {
                ticketId: updated.id,
                status: syncResult.status,
                error: syncResult.error,
            });
        }

        return { data: { updated, urlsToDelete } };
    } catch (error) {
        return { error: toErrorMessage(error, "Failed to update ticket.") };
    }
}

export async function getSingleTicket(id: string): Promise<SingleTicket | null> {
    return getOrSetCache(
        helpdeskRedisKeys.singleTicket(id),
        HELPDESK_CACHE_TTL_SECONDS.singleTicket,
        async () =>
            prisma.ticket.findFirst({
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

                    images: {
                        select: {
                            id: true,
                            url: true,
                        },
                    },
                },
            }),
    );
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
    const normalizedOptions = {
        search: options?.search ?? {},
        filters: options?.filters ?? {},
        page: options?.page ?? 1,
        pageSize: options?.pageSize ?? 20,
    };
    const currentUserId = await getCurrentUserId();
    const signature = hashKeyPayload({
        normalizedOptions,
        currentUserId: currentUserId ?? null,
    });
    const cacheKey = helpdeskRedisKeys.ticketsList(currentUserId, signature);
    return getOrSetCache(
        cacheKey,
        HELPDESK_CACHE_TTL_SECONDS.ticketsList,
        async () => {
            const { search, filters, page, pageSize } = normalizedOptions;
            const safePage = Math.max(1, page);
            const safePageSize = Number.isFinite(pageSize)
                ? Math.max(0, Math.floor(pageSize))
                : 20;
            const showAllRows = safePageSize === 0;
            // Default အဖြစ် archived ticket မပါစေချင်လို့ unarchived only condition နဲ့စထားပါတယ်။
            const where: Prisma.TicketWhereInput = { isArchived: false };
            if (search) {
                const orArray: Prisma.TicketWhereInput[] = [];
                const searchArray = Object.entries(search);
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
                        Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
                    where.AND = [...currentAND, { OR: orArray }];
                }
            }
            if (filters) {
                for (const [group, values] of Object.entries(filters)) {
                    if (!values.length) continue;
                    if (group === "Status") {
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
                    if (group === "Creation Mode") {
                        const modeValues = values.filter((item): item is CreationMode =>
                            VALID_CREATION_MODE_SET.has(item as CreationMode),
                        );
                        if (modeValues.length) {
                            where.creationMode = { in: modeValues };
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
            const total = await prisma.ticket.count({ where });
            const tickets = await prisma.ticket.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: showAllRows ? 0 : (safePage - 1) * safePageSize,
                ...(showAllRows ? {} : { take: safePageSize }),
                include: {
                    requester: { select: { name: true, email: true } },
                    assignedTo: { select: { name: true, email: true } },
                    department: { select: { id: true, name: true } },
                },
            });
            return { tickets, total };
        },
    );
}



// ======================
// Get MY Tickets Count
// ======================
export async function getMyTickets(): Promise<
    TicketActionResult<{
        request: number;
        minor: number;
        major: number;
        critical: number;
        assignedTotal: number;
        openedRequest: number;
        openedMinor: number;
        openedMajor: number;
        openedCritical: number;
        openedTotal: number;
        closedCount: number;
        slaSuccess: number;
        slaFail: number;
    }>
> {
    const userId = await getCurrentUserId();
    if (!userId) {
        return { error: "Unauthorized" };
    }

    const cacheKey = helpdeskRedisKeys.myTickets(userId);
    try {
        const data = await getOrSetCache(
            cacheKey,
            HELPDESK_CACHE_TTL_SECONDS.myTickets,
            async () => {
                const priorityOrder: Priority[] = [
                    "REQUEST",
                    "MINOR",
                    "MAJOR",
                    "CRITICAL",
                ];
                const countByOwnerAndPriority = async (
                    ownerField: "assignedToId" | "requesterId",
                ) => {
                    const [request, minor, major, critical] = await Promise.all(
                        priorityOrder.map((priority) =>
                            prisma.ticket.count({
                                where: {
                                    [ownerField]: userId,
                                    priority,
                                    isArchived: false,
                                    status: { in: ACTIVE_WORK_STATUSES },
                                } as Prisma.TicketWhereInput,
                            }),
                        ),
                    );
                    return {
                        request,
                        minor,
                        major,
                        critical,
                        total: request + minor + major + critical,
                    };
                };

                const [assignedCounts, openedCounts] = await Promise.all([
                    countByOwnerAndPriority("assignedToId"),
                    countByOwnerAndPriority("requesterId"),
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

                return {
                    request: assignedCounts.request,
                    minor: assignedCounts.minor,
                    major: assignedCounts.major,
                    critical: assignedCounts.critical,
                    assignedTotal: assignedCounts.total,
                    openedRequest: openedCounts.request,
                    openedMinor: openedCounts.minor,
                    openedMajor: openedCounts.major,
                    openedCritical: openedCounts.critical,
                    openedTotal: openedCounts.total,
                    closedCount,
                    slaSuccess,
                    slaFail,
                };
            },
        );

        return { data };
    } catch (error) {
        return { error: toErrorMessage(error, "Failed to load ticket stats.") };
    }
}

export async function getTicketAuditLogs(ticketId: string) {
    return getOrSetCache(
        helpdeskRedisKeys.ticketAudits(ticketId),
        HELPDESK_CACHE_TTL_SECONDS.ticketAudits,
        async () =>
            prisma.audit.findMany({
                where: {
                    entity: "Ticket",
                    entityId: ticketId,
                },
                orderBy: { changedAt: "desc" },
                include: {
                    user: { select: { name: true, email: true } },
                },
            }),
    );
}

export async function getSlaViolationCount(): Promise<
    TicketActionResult<{ count: number }>
> {
    const userId = await getCurrentUserId();
    if (!userId) return { error: "Unauthorized" };

    try {
        const count = await prisma.ticket.count({
            where: {
                isArchived: false,
                isSlaViolated: true,
                status: { notIn: CLOSED_LIKE_STATUSES },
            },
        });

        return { data: { count } };
    } catch (error) {
        return { error: toErrorMessage(error, "Failed to load SLA violations.") };
    }
}

export async function deleteTickets(
    ticketIds: string[],
): Promise<TicketActionResult<{ ids: string[] }>> {
    if (!ticketIds.length) return { error: "No ticket ids provided." };

    const adminResult = await requireSuperAdminAndEmail();
    if ("error" in adminResult) {
        return { error: adminResult.error };
    }

    const tickets = await prisma.ticket.findMany({
        where: { id: { in: ticketIds } },
        select: { id: true, isArchived: true },
    });

    if (!tickets.length) return { error: "No matching tickets found." };

    const idsToArchive = tickets.filter((ticket) => !ticket.isArchived).map((ticket) => ticket.id);
    if (!idsToArchive.length) {
        return { data: { ids: ticketIds } };
    }

    try {
        await prisma.ticket.updateMany({
            where: { id: { in: idsToArchive } },
            data: { isArchived: true },
        });

        const auditEntries = idsToArchive.map((id) => ({
            entity: "Ticket",
            entityId: id,
            userId: adminResult.data.id,
            action: "UPDATE" as const,
            changes: [
                {
                    field: "isArchived",
                    oldValue: "false",
                    newValue: "true",
                },
            ],
        }));

        await prisma.audit.createMany({ data: auditEntries });

        await invalidateCacheByPrefixes([
            HELPDESK_CACHE_PREFIXES.tickets,
            HELPDESK_CACHE_PREFIXES.overview,
            HELPDESK_CACHE_PREFIXES.departments,
            HELPDESK_CACHE_PREFIXES.analysis,
            HELPDESK_CACHE_PREFIXES.users,
        ]);

        emitTicketsChanged({
            action: "deleted",
            ids: idsToArchive,
            at: new Date().toISOString(),
        });

        return { data: { ids: idsToArchive } };
    } catch (error) {
        return { error: toErrorMessage(error, "Failed to delete tickets.") };
    }
}





