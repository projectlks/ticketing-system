import dayjs from "@/libs/dayjs";
import { Priority, Status, Ticket } from "@/generated/prisma/client";
import { requireSuperAdminAndEmail } from "@/libs/admin-guard";
import { prisma } from "@/libs/prisma";
import { invalidateCacheByPrefixes } from "@/libs/redis-cache";
import { emitTicketsChanged } from "@/libs/socket-emitter";
import { syncTicketOutbound } from "@/libs/ticket-outbound-sync";
import { HELPDESK_CACHE_PREFIXES } from "../../cache/redis-keys";
import { getSingleTicket, getTicketAuditLogs } from "./queries";
import {
  SUPER_ADMIN_ROLE,
  type TicketActionResult,
  type TicketMutationOptions,
  type UpdatedTicketWithRelations,
  VALID_STATUS_SET,
  TicketFormSchema,
  createFormSchema,
  ensureAssignableUserExists,
  normalizeOptionalRelationId,
  resolveActorContext,
  toErrorMessage,
  validateTicketAttachmentUrls,
} from "./shared";

const HELP_DESK_INVALIDATION_PREFIXES = [
  HELPDESK_CACHE_PREFIXES.tickets,
  HELPDESK_CACHE_PREFIXES.overview,
  HELPDESK_CACHE_PREFIXES.departments,
  HELPDESK_CACHE_PREFIXES.analysis,
  HELPDESK_CACHE_PREFIXES.users,
];

export async function generateTicketId(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");

  const count = await prisma.ticket.count({
    where: {
      createdAt: {
        gte: new Date(year, now.getMonth(), 1),
        lt: new Date(year, now.getMonth() + 1, 1),
      },
    },
  });

  const ticketNumber = (count + 1).toString().padStart(3, "0");
  return `TKT-${year}-${month}-${ticketNumber}`;
}

export async function createTicket(
  formData: FormData,
  options: TicketMutationOptions = {},
): Promise<TicketActionResult<Ticket>> {
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

  const actor = await resolveActorContext(options.actorUserId);
  if (!actor) return { error: "Unauthorized" };
  const userId = actor.id;

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
  const attachmentsError = validateTicketAttachmentUrls(images);
  if (attachmentsError) return { error: attachmentsError };

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
      include: {
        department: {
          select: {
            name: true,
            email: true,
          },
        },
        category: {
          select: {
            name: true,
          },
        },
        requester: {
          select: {
            name: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            name: true,
            email: true,
          },
        },
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
        userId,
        action: "CREATE",
      },
    });

    await invalidateCacheByPrefixes(HELP_DESK_INVALIDATION_PREFIXES);

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
      console.log("[ticket-sync] outbound create sync failed", {
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
  TicketActionResult<{
    updated: UpdatedTicketWithRelations;
    urlsToDelete: string[];
  }>
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
          email: true,
        },
      },
    },
  });

  if (!oldData) return { error: "Ticket not found" };

  const actor = await resolveActorContext(options.actorUserId);
  if (!actor) return { error: "Unauthorized" };
  const currentUserId = actor.id;
  const isSuperAdmin = actor.role === SUPER_ADMIN_ROLE;
  if (
    !isSuperAdmin &&
    (parsed.data.title !== oldData.title ||
      parsed.data.description !== oldData.description)
  ) {
    return {
      error: "Only SUPER_ADMIN can edit title and description.",
    };
  }

  const isPriorityProvided = parsed.data.priority !== undefined;
  const priorityChanged =
    isPriorityProvided && parsed.data.priority !== oldData.priority;

  const normalizedRemark = (parsed.data.remark ?? "").trim();
  if (priorityChanged && !normalizedRemark) {
    return {
      error: "Remark is required when changing priority.",
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

  const normalizedAssignedToId = normalizeOptionalRelationId(
    parsed.data.assignedToId,
  );
  const assignError = await ensureAssignableUserExists(normalizedAssignedToId);
  if (assignError) return { error: assignError };

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
    const finalAttachmentUrls = imagesInDb
      .filter((img) => !idsToDeleteSet.has(img.id))
      .map((img) => img.url)
      .concat(newImageUrls);
    const attachmentsError =
      validateTicketAttachmentUrls(finalAttachmentUrls);
    if (attachmentsError) return { error: attachmentsError };

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
    const responseDue = dayjs(slaBaseTime)
      .add(sla.responseTime, "minute")
      .toDate();
    const resolutionDue = dayjs(slaBaseTime)
      .add(sla.resolutionTime, "minute")
      .toDate();

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        departmentId: parsed.data.departmentId,
        categoryId: parsed.data.categoryId,
        priority: parsed.data.priority,
        remark: normalizedRemark,
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
            email: true,
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

    const changes: { field: string; oldValue: string; newValue: string }[] =
      [];

    for (const field of changedFields) {
      let oldValue = "";
      let newValue = "";

      if (field === "departmentId") {
        oldValue = oldData.department?.name ?? "";
        newValue = updated.department?.name ?? "";
      } else if (field === "categoryId") {
        oldValue = oldData.category?.name ?? "";
        newValue = updated.category?.name ?? "";
      } else if (field === "assignedToId") {
        oldValue = oldData.assignedTo?.name ?? "";
        newValue = updated.assignedTo?.name ?? "";
      } else if (field === "remark") {
        oldValue = oldData.remark ?? "";
        newValue = normalizedRemark;
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
          changes,
        },
      });
    }

    await invalidateCacheByPrefixes(HELP_DESK_INVALIDATION_PREFIXES);

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
      console.log("[ticket-sync] outbound update sync failed", {
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

export async function updateTicketStatus(
  ticketId: string,
  status: Status,
  options: TicketMutationOptions = {},
): Promise<TicketActionResult<{ updated: UpdatedTicketWithRelations }>> {
  if (!ticketId) return { error: "Ticket ID is required" };

  if (!VALID_STATUS_SET.has(status)) {
    return { error: "Invalid status value." };
  }

  const oldData = await prisma.ticket.findFirst({
    where: { id: ticketId },
    select: { id: true, status: true },
  });
  if (!oldData) return { error: "Ticket not found" };

  const actor = await resolveActorContext(options.actorUserId);
  const allowApiTokenActorlessUpdate =
    options.allowApiTokenActorlessUpdate === true;
  if (!actor && !allowApiTokenActorlessUpdate) {
    return { error: "Unauthorized" };
  }
  const currentUserId = actor?.id ?? null;

  try {
    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: { status },
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
            email: true,
          },
        },
      },
    });

    if (oldData.status !== updated.status) {
      await prisma.audit.create({
        data: {
          entity: "Ticket",
          entityId: updated.id,
          userId: currentUserId ?? undefined,
          action: "UPDATE",
          changes: [
            {
              field: "status",
              oldValue: String(oldData.status),
              newValue: String(updated.status),
            },
          ],
        },
      });
    }

    await invalidateCacheByPrefixes(HELP_DESK_INVALIDATION_PREFIXES);

    try {
      await Promise.all([
        getSingleTicket(ticketId),
        getTicketAuditLogs(ticketId),
      ]);
    } catch (error) {
      console.warn("[ticket-cache] status cache warm failed", {
        ticketId,
        message: error instanceof Error ? error.message : String(error),
      });
    }

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
      console.log("[ticket-sync] outbound update sync failed", {
        ticketId: updated.id,
        status: syncResult.status,
        error: syncResult.error,
      });
    }

    return { data: { updated } };
  } catch (error) {
    return {
      error: toErrorMessage(error, "Failed to update ticket status."),
    };
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

  const idsToArchive = tickets
    .filter((ticket) => !ticket.isArchived)
    .map((ticket) => ticket.id);
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

    await invalidateCacheByPrefixes(HELP_DESK_INVALIDATION_PREFIXES);

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
