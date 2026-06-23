// မှီခိုနေရသော library များနှင့် helper function များကို import လုပ်ခြင်း
import dayjs from "@/libs/dayjs";
import { Audit, Priority, Status, Ticket } from "@/generated/prisma/client";
import { requireSuperAdminAndEmail } from "@/libs/admin-guard";
import { prisma } from "@/libs/prisma";
import { invalidateCacheByPrefixes } from "@/libs/redis-cache";
import { emitTicketsChanged } from "@/libs/socket-emitter";
import { syncTicketOutbound } from "@/libs/ticket-outbound-sync";
import { HELPDESK_CACHE_PREFIXES } from "../../cache/redis-keys";
import {
  SUPER_ADMIN_ROLE,
  type TicketActionResult,
  type TicketMutationOptions,
  type UpdatedTicketWithRelations,
  TicketFormSchema,
  createFormSchema,
  ensureAssignableUserExists,
  normalizeOptionalRelationId,
  resolveActorContext,
  toErrorMessage,
  validateTicketAttachmentUrls,
} from "./shared";

// 🌟 OTRS Handlers များကို Import လုပ်ခြင်း
import {
  handleOtrsTicketCreate,
  handleOtrsTicketUpdate,
  type OtrsTicketData,
} from "./otrs-handlers";

// Cache ရှင်းလင်းရာတွင် အသုံးပြုမည့် prefix များ
const HELP_DESK_INVALIDATION_PREFIXES: string[] = [
  HELPDESK_CACHE_PREFIXES.tickets,
  HELPDESK_CACHE_PREFIXES.overview,
  HELPDESK_CACHE_PREFIXES.departments,
  HELPDESK_CACHE_PREFIXES.analysis,
  HELPDESK_CACHE_PREFIXES.users,
];

// ==========================================
// 🚀 EXPORTED MUTATIONS (အဓိက လုပ်ဆောင်မည့် Function များ)
// ==========================================

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
  try {
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
      return { error: parsed.error.issues[0]?.message ?? "Invalid ticket data." };
    }

    const normalizedAssignedToId = normalizeOptionalRelationId(parsed.data.assignedToId);

    const actor = await resolveActorContext(options.actorUserId);
    if (!actor) return { error: "Unauthorized" };
    const userId = actor.id;

    const relationError = await validateRelations(parsed.data.categoryId, parsed.data.departmentId);
    if (relationError) return { error: relationError };

    const assignError = await ensureAssignableUserExists(normalizedAssignedToId);
    if (assignError) return { error: assignError };

    const ticketId = await generateTicketId();

    const imagesResult = parseJsonArrayPayload(formData, "images");
    if (imagesResult.error) return { error: imagesResult.error };
    const images = imagesResult.data;

    const attachmentsError = validateTicketAttachmentUrls(images);
    if (attachmentsError) return { error: attachmentsError };

    const priority = parsed.data.priority;
    const slaResult = await calculateSLA(priority, new Date());
    if (slaResult.error || !slaResult.data) return { error: slaResult.error };

    const ticket = await prisma.ticket.create({
      data: {
        slaId: slaResult.data.slaId,
        startSlaTime: slaResult.data.baseTime,
        responseDue: slaResult.data.responseDue,
        resolutionDue: slaResult.data.resolutionDue,
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
        department: { select: { name: true, email: true } },
        category: { select: { name: true } },
        requester: { select: { name: true, email: true } },
        assignedTo: { select: { name: true, email: true } },
      },
    });

    if (images.length) {
      await prisma.ticketImage.createMany({
        data: images.map((url: string) => ({ ticketId: ticket.id, url })),
      });
    }

    // ==========================================
    // 🚀 SECTION 5.2: OTRS API INTEGRATION
    // ==========================================
    await handleOtrsTicketCreate(ticket as unknown as OtrsTicketData, images);
    // ==========================================

    await prisma.audit.create({
      data: { entity: "Ticket", entityId: ticket.id, userId, action: "CREATE" },
    });

    await triggerPostMutationHooks({ event: "created", ticketId: ticket.id, status: ticket.status, ticket });

    return { data: ticket };
  } catch (error) {
    return { error: toErrorMessage(error, "Failed to create ticket.") };
  }
}

export async function updateTicket(
  ticketId: string,
  formData: FormData,
  options: TicketMutationOptions = {},
): Promise<TicketActionResult<{ updated: UpdatedTicketWithRelations; urlsToDelete: string[] }>> {
  if (!ticketId) return { error: "Ticket ID is required" };

  try {
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
      return { error: parsed.error.issues[0]?.message ?? "Invalid ticket data." };
    }

    const oldData = await prisma.ticket.findFirst({
      where: { id: ticketId },
      include: {
        department: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    if (!oldData) return { error: "Ticket not found" };

    const actor = await resolveActorContext(options.actorUserId);
    if (!actor) return { error: "Unauthorized" };
    const currentUserId = actor.id;

    const authError = validateEditPermissions(actor, oldData, parsed.data);
    if (authError) return { error: authError };

    const isPriorityProvided = parsed.data.priority !== undefined;
    const priorityChanged = isPriorityProvided && parsed.data.priority !== oldData.priority;

    const normalizedRemark = (parsed.data.remark ?? "").trim();
    if (priorityChanged && !normalizedRemark) {
      return { error: "Remark is required when changing priority." };
    }

    const relationError = await validateRelations(parsed.data.categoryId, parsed.data.departmentId);
    if (relationError) return { error: relationError };

    const normalizedAssignedToId = normalizeOptionalRelationId(parsed.data.assignedToId);
    const assignError = await ensureAssignableUserExists(normalizedAssignedToId);
    if (assignError) return { error: assignError };

    const imageSync = await syncUpdateImages(ticketId, formData);
    if (imageSync.error || !imageSync.data) return { error: imageSync.error };

    const priority = parsed.data.priority;
    const rawSlaBaseTime = oldData.startSlaTime ?? oldData.createdAt;
    const slaBaseTime = Number.isNaN(rawSlaBaseTime.getTime()) ? new Date() : rawSlaBaseTime;

    const slaResult = await calculateSLA(priority, slaBaseTime);
    if (slaResult.error || !slaResult.data) return { error: slaResult.error };

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
        status: parsed.data.status as Status,
        slaId: slaResult.data.slaId,
        startSlaTime: slaBaseTime,
        responseDue: slaResult.data.responseDue,
        resolutionDue: slaResult.data.resolutionDue,
      },
      include: {
        department: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    const changes = computeAuditChanges(oldData, parsed.data, updated, normalizedRemark);

    let newAudit : Audit | null = null;
    if (changes.length > 0) {
    newAudit = await prisma.audit.create({
      data: {
        entity: "Ticket", entityId: updated.id, userId: currentUserId, action: "UPDATE", changes, syncState: { otrs: "PENDING" }  },
      });



    }

    await triggerPostMutationHooks({ event: "updated", ticketId: updated.id, status: updated.status, ticket: updated });

    // ==========================================
    // 🚀 SECTION 5.3 & 5.4: OTRS API INTEGRATION FOR JSC
    // ==========================================
    await handleOtrsTicketUpdate(
      updated as unknown as OtrsTicketData,
      oldData as unknown as OtrsTicketData,
      imageSync.data.newImageUrls,
      imageSync.data.finalAttachmentUrls,
      normalizedRemark,
      newAudit
    );
    // ==========================================

    return { data: { updated, urlsToDelete: imageSync.data.urlsToDelete } };
  } catch (error) {
    return { error: toErrorMessage(error, "Failed to update ticket.") };
  }
}

// export async function updateTicketStatus(
//   ticketId: string,
//   status: Status,
//   options: TicketMutationOptions = {},
// ): Promise<TicketActionResult<{ updated: UpdatedTicketWithRelations }>> {
//   if (!ticketId) return { error: "Ticket ID is required" };

//   if (!VALID_STATUS_SET.has(status)) {
//     return { error: "Invalid status value." };
//   }

//   const oldData = await prisma.ticket.findFirst({
//     where: { id: ticketId },
//     select: { id: true, status: true },
//   });
//   if (!oldData) return { error: "Ticket not found" };

//   const actor = await resolveActorContext(options.actorUserId);
//   const allowApiTokenActorlessUpdate = options.allowApiTokenActorlessUpdate === true;
//   if (!actor && !allowApiTokenActorlessUpdate) {
//     return { error: "Unauthorized" };
//   }
//   const currentUserId = actor?.id ?? null;
//   try {
//     const updated = await prisma.ticket.update({
//       where: { id: ticketId },
//       data: { status },
//       include: {
//         department: { select: { id: true, name: true } },
//         category: { select: { id: true, name: true } },
//         assignedTo: { select: { id: true, name: true, email: true } },
//       },
//     });

//     let newAudit: Audit | null = null;
//     if (oldData.status !== updated.status) {
//       newAudit = await prisma.audit.create({
//         data: {
//           entity: "Ticket",
//           entityId: updated.id,
//           userId: currentUserId ?? undefined,
//           action: "UPDATE",
//           changes: [{ field: "status", oldValue: String(oldData.status), newValue: String(updated.status) }],
//           syncState: { otrs: "PENDING" } // 🌟 ဒီနေရာမှာ PENDING ဖြင့် စတင်မှတ်သားပါမည်
//         },
//       });
//     }

//     await invalidateCacheByPrefixes(HELP_DESK_INVALIDATION_PREFIXES);

//     try {
//       await Promise.all([getSingleTicket(ticketId), getTicketAuditLogs(ticketId)]);
//     } catch (error) {
//       console.warn("[ticket-cache] status cache warm failed", {
//         ticketId,
//         message: error instanceof Error ? error.message : String(error),
//       });
//     }

//     emitTicketsChanged({
//       action: "updated",
//       ticketId: updated.id,
//       status: updated.status,
//       at: new Date().toISOString(),
//     });

//     const syncResult = await syncTicketOutbound({ event: "updated", ticketId: updated.id, ticket: updated });
//     if (!syncResult.ok && !syncResult.skipped) {
//       console.log("[ticket-sync] outbound update sync failed", {
//         ticketId: updated.id,
//         status: syncResult.status,
//         error: syncResult.error,
//       });
//     }

//     // ==========================================
//     // 🚀 SECTION 5.3: OTRS API INTEGRATION (For JSC Status Only Update)
//     // ==========================================
//     // 🌟 newAudit အား Handler သို့ ထည့်ပေးလိုက်ပါမည်
//     await handleOtrsTicketStatusUpdate(updated as unknown as OtrsTicketData, oldData as unknown as OtrsTicketData, newAudit);
//     // ==========================================

//     return { data: { updated } };
//   } catch (error) {
//     return { error: toErrorMessage(error, "Failed to update ticket status.") };
//   }
// }

export async function deleteTickets(ticketIds: string[]): Promise<TicketActionResult<{ ids: string[] }>> {
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
      changes: [{ field: "isArchived", oldValue: "false", newValue: "true" }],
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


// ==========================================
// 🛠️ INTERNAL HELPER FUNCTIONS (အတွင်းပိုင်း အသုံးပြုမည့် အကူ function များ)
// ==========================================

async function validateRelations(categoryId?: string, departmentId?: string): Promise<string | null> {
  if (categoryId) {
    const categoryExists = await prisma.category.findUnique({ where: { id: categoryId, isArchived: false } });
    if (!categoryExists) return "Selected category does not exist";
  }
  if (departmentId) {
    const departmentExists = await prisma.department.findUnique({ where: { id: departmentId, isArchived: false } });
    if (!departmentExists) return "Selected department does not exist";
  }
  return null;
}

// Array Payload များအတွက် Error string များကို Original အတိုင်း အတိအကျ ပေးပို့နိုင်ရန်
function parseJsonArrayPayload(formData: FormData, key: string): { data: string[], error?: string } {
  const rawValue = formData.get(key);
  if (typeof rawValue === "string" && rawValue.trim()) {
    try {
      const parsed = JSON.parse(rawValue);
      if (!Array.isArray(parsed)) return { data: [], error: `Invalid ${key} payload.` };
      return { data: parsed as string[] };
    } catch {
      return { data: [], error: `Invalid ${key} payload.` };
    }
  }
  return { data: [] };
}

// Ticket Priority အပေါ်မူတည်၍ SLA များကို တွက်ချက်ခြင်း
async function calculateSLA(
  priority: Priority | undefined,
  baseTime: Date
): Promise<{ error?: string; data?: { slaId: string; baseTime: Date; responseDue: Date; resolutionDue: Date } }> {
  const sla = await prisma.sLA.findUnique({ where: { priority } });
  if (!sla) return { error: `No SLA found for priority: ${priority}` };

  return {
    data: {
      slaId: sla.id,
      baseTime,
      responseDue: dayjs(baseTime).add(sla.responseTime, "minute").toDate(),
      resolutionDue: dayjs(baseTime).add(sla.resolutionTime, "minute").toDate(),
    }
  };
}

// Ticket Create နှင့် Update အတွက် Cache ရှင်းခြင်းနှင့် Socket လွှင့်ခြင်းလုပ်ငန်းများ
async function triggerPostMutationHooks(params: {
  event: "created" | "updated";
  ticketId: string;
  status: string;
  ticket: Ticket | UpdatedTicketWithRelations
}): Promise<void> {
  await invalidateCacheByPrefixes(HELP_DESK_INVALIDATION_PREFIXES);

  emitTicketsChanged({
    action: params.event,
    ticketId: params.ticketId,
    status: params.status,
    at: new Date().toISOString(),
  });

  const syncResult = await syncTicketOutbound({
    event: params.event,
    ticketId: params.ticketId,
    ticket: params.ticket,
  });

  if (!syncResult.ok && !syncResult.skipped) {
    // Original မှတ်တမ်းအတိုင်း create နှင့် update စာသားကို တိကျစွာ ခွဲခြားထုတ်ပေးခြင်း
    const logAction = params.event === "created" ? "create" : "update";
    console.log(`[ticket-sync] outbound ${logAction} sync failed`, {
      ticketId: params.ticketId,
      status: syncResult.status,
      error: syncResult.error,
    });
  }
}

function validateEditPermissions(
  actor: { role: string; id: string },
  oldData: { title: string | null; description: string | null },
  parsedData: { title?: string; description?: string }
): string | null {
  const isSuperAdmin = actor.role === SUPER_ADMIN_ROLE;
  if (!isSuperAdmin && (parsedData.title !== oldData.title || parsedData.description !== oldData.description)) {
    return "Only SUPER_ADMIN can edit title and description.";
  }
  return null;
}

// Ticket Update လုပ်ရာတွင် ပုံအဟောင်း၊ အသစ်များကို စစ်ဆေး၍ ဖယ်ရှား/ပေါင်းထည့်ခြင်း
async function syncUpdateImages(ticketId: string, formData: FormData): Promise<{
  error?: string;
  data?: { urlsToDelete: string[]; newImageUrls: string[]; finalAttachmentUrls: string[] }
}> {
  const existingResult = parseJsonArrayPayload(formData, "existingImageIds");
  const newResult = parseJsonArrayPayload(formData, "newImages");

  if (existingResult.error) return { error: existingResult.error };
  if (newResult.error) return { error: newResult.error };

  const existingImageIds = existingResult.data;
  const newImageUrls = newResult.data;

  let deletedImageIds: string[] | null = null;
  if (formData.has("deletedImageIds")) {
    const rawDeletedIds = formData.get("deletedImageIds");
    if (typeof rawDeletedIds === "string" && rawDeletedIds.trim()) {
      try {
        const parsedDeleted = JSON.parse(rawDeletedIds);
        if (!Array.isArray(parsedDeleted)) return { error: "Invalid deletedImageIds payload." };
        deletedImageIds = parsedDeleted as string[];
      } catch {
        return { error: "Invalid deletedImageIds payload." };
      }
    } else {
      deletedImageIds = [];
    }
  }

  const hasExistingImageIdsField = formData.has("existingImageIds");

  const imagesInDb = await prisma.ticketImage.findMany({ where: { ticketId }, select: { id: true, url: true } });
  const imagesInDbIds = imagesInDb.map((img: { id: string }) => img.id);
  const imagesInDbIdSet = new Set(imagesInDbIds);

  let idsToDelete: string[] = [];
  if (deletedImageIds && deletedImageIds.length) {
    idsToDelete = deletedImageIds.filter((id) => imagesInDbIdSet.has(id));
  } else if (hasExistingImageIdsField) {
    idsToDelete = imagesInDbIds.filter((dbId) => !existingImageIds.includes(dbId));
  }

  const idsToDeleteSet = new Set(idsToDelete);
  const urlsToDelete = imagesInDb.filter((img: { id: string; url: string }) => idsToDeleteSet.has(img.id)).map((img: { url: string }) => img.url);
  const finalAttachmentUrls = imagesInDb.filter((img: { id: string; url: string }) => !idsToDeleteSet.has(img.id)).map((img: { url: string }) => img.url).concat(newImageUrls);

  const attachmentsError = validateTicketAttachmentUrls(finalAttachmentUrls);
  if (attachmentsError) return { error: attachmentsError };

  if (idsToDelete.length > 0) {
    await prisma.ticketImage.deleteMany({ where: { id: { in: idsToDelete } } });
  }

  if (newImageUrls.length) {
    const newImagesData = newImageUrls.map((url) => ({ ticketId, url }));
    await prisma.ticketImage.createMany({ data: newImagesData });
  }

  return { data: { urlsToDelete, newImageUrls, finalAttachmentUrls } };
}

// Audit Log သိမ်းဆည်းရန်အတွက် Type အတိအကျ သတ်မှတ်ထားခြင်း
type AuditComparableData = {
  title?: string | null;
  description?: string | null;
  department?: { name: string } | null;
  category?: { name: string } | null;
  assignedTo?: { name: string } | null;
  priority?: string | null;
  status?: string | null;
  remark?: string | null;
  [key: string]: unknown;
};

// Audit Log သိမ်းဆည်းရန်အတွက် ပြောင်းလဲသွားသော အချက်အလက် (Changes) များကို တိုက်ဆိုင်စစ်ဆေးခြင်း
function computeAuditChanges(
  oldData: AuditComparableData,
  parsedData: Record<string, unknown>,
  updatedData: AuditComparableData,
  normalizedRemark: string
): { field: string; oldValue: string; newValue: string }[] {

  const changedFields = ["title", "description", "departmentId", "categoryId", "priority", "remark", "assignedToId", "status"] as const;
  const changes: { field: string; oldValue: string; newValue: string }[] = [];

  for (const field of changedFields) {
    let oldValue = "";
    let newValue = "";

    if (field === "departmentId") {
      oldValue = oldData.department?.name ?? "";
      newValue = updatedData.department?.name ?? "";
    } else if (field === "categoryId") {
      oldValue = oldData.category?.name ?? "";
      newValue = updatedData.category?.name ?? "";
    } else if (field === "assignedToId") {
      oldValue = oldData.assignedTo?.name ?? "";
      newValue = updatedData.assignedTo?.name ?? "";
    } else if (field === "remark") {
      oldValue = oldData.remark ?? "";
      newValue = normalizedRemark;
    } else {
      oldValue = String(oldData[field] ?? "");
      newValue = String(parsedData[field] ?? "");
    }

    if (oldValue !== newValue) changes.push({ field, oldValue, newValue });
  }
  return changes;
}