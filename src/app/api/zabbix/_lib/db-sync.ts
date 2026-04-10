import { Status, ZabbixStatus } from "@/generated/prisma/client";
import dayjs from "@/libs/dayjs";
import { prisma } from "@/libs/prisma";
import { HELPDESK_CACHE_PREFIXES } from "@/app/helpdesk/cache/redis-keys";
import { invalidateCacheByPrefixes } from "@/libs/redis-cache";
import { AUTO_AUDIT_SOURCE } from "./constants";
import {
  AuditChange,
  InternalTicketUpsertResult,
  NormalizedWebhookContext,
  RecoveryFallbackTicket,
  ZabbixUpsertAction,
} from "./types";

/**
 * =====================================================================================
 * DB Sync Module
 * =====================================================================================
 *
 * This module contains only persistence concerns:
 * 1) Upsert raw Zabbix event snapshot table
 * 2) Upsert internal helpdesk ticket table
 * 3) Write audit logs for traceability
 * 4) Invalidate cache keys related to changed records
 *
 * Route and webhook parser should never contain database write details.
 */

/**
 * Create deterministic ticket number for auto-created webhook tickets.
 *
 * Format: TKT-YYYY-MM-XXX
 */
async function generateTicketIdForWebhook(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  const count = await prisma.ticket.count({
    where: {
      createdAt: {
        gte: new Date(year, now.getMonth(), 1),
        lt: new Date(year, now.getMonth() + 1, 1),
      },
    },
  });

  const ticketNumber = String(count + 1).padStart(3, "0");
  return `TKT-${year}-${month}-${ticketNumber}`;
}

/**
 * Save/update monitoring snapshot row.
 *
 * Key policy:
 * - For PROBLEM event: use current event id
 * - For RECOVERY event: use original problem event id
 *
 * This keeps one canonical row per problem lifecycle.
 */
export async function upsertZabbixSnapshot(
  context: NormalizedWebhookContext,
): Promise<ZabbixUpsertAction> {
  const targetEventId = context.isRecoveryEvent
    ? context.problemEventId
    : context.event.id;

  const existing = await prisma.zabbixTicket.findUnique({
    where: { eventid: targetEventId },
    select: { eventid: true },
  });

  const baseData = {
    name: context.trigger.name ?? `Zabbix Event ${targetEventId}`,
    status: context.status,
    triggerId: context.normalizedTriggerId,
    triggerName: context.trigger.name ?? null,
    triggerDesc: context.trigger.description ?? null,
    triggerStatus: context.trigger.status ?? null,
    triggerSeverity: context.trigger.severity ?? null,
    hostName: context.normalizedHostName,
    hostTag: context.host.inventory_tag ?? null,
    hostGroup: context.host.group ?? null,
    itemId: context.item.id ?? null,
    itemName: context.item.name ?? null,
    itemDescription: context.item.key ?? null,
    last5Values: context.last5Values,
    tags: context.tagsString,
  };

  const updateData: typeof baseData & { clock?: Date; resolvedAt: Date | null } = {
    ...baseData,
    resolvedAt: context.isRecoveryEvent ? context.clock : null,
  };

  // Recovery should not overwrite original problem start time.
  if (!context.isRecoveryEvent) {
    updateData.clock = context.clock;
  }

  await prisma.zabbixTicket.upsert({
    where: {
      eventid: targetEventId,
    },
    update: updateData,
    create: {
      eventid: targetEventId,
      clock: context.clock,
      resolvedAt: context.isRecoveryEvent ? context.clock : null,
      ...baseData,
    },
  });

  return existing ? "updated" : "created";
}

function toTicketZabbixStatus(status: "0" | "1"): ZabbixStatus {
  return status === "0" ? "PROBLEM" : "RESOLVED";
}

function toAuditChange(field: string, oldValue: unknown, newValue: unknown): AuditChange | null {
  const from = oldValue === undefined || oldValue === null ? "" : String(oldValue);
  const to = newValue === undefined || newValue === null ? "" : String(newValue);
  if (from === to) return null;
  return { field, oldValue: from, newValue: to };
}

/**
 * Recovery fallback matcher:
 *
 * If direct problemId lookup misses, find latest unresolved problem event by
 * triggerId + hostName before recovery time, then map to open internal ticket.
 */
async function resolveFallbackTicketForRecovery(
  context: NormalizedWebhookContext,
): Promise<RecoveryFallbackTicket | null> {
  const latestProblemEvent = await prisma.zabbixTicket.findFirst({
    where: {
      triggerId: context.normalizedTriggerId,
      hostName: context.normalizedHostName,
      status: "0",
      clock: { lte: context.clock },
    },
    orderBy: { clock: "desc" },
    select: { eventid: true },
  });

  if (!latestProblemEvent?.eventid) {
    return null;
  }

  return prisma.ticket.findFirst({
    where: {
      problemId: `zabbix-${latestProblemEvent.eventid}`,
      zabbixStatus: "PROBLEM",
      status: { in: [Status.NEW, Status.OPEN, Status.IN_PROGRESS] },
    },
    select: { id: true, problemId: true },
  });
}

/**
 * Upsert internal helpdesk ticket row based on normalized webhook context.
 */
export async function upsertInternalHelpdeskTicket(
  context: NormalizedWebhookContext,
): Promise<InternalTicketUpsertResult> {
  const zabbixStatus = toTicketZabbixStatus(context.status);
  const title = context.trigger.name ?? `Zabbix Event ${context.event.id}`;
  const description = `Host: ${context.normalizedHostName}, Trigger: ${context.trigger.name ?? "unknown"}, Item: ${context.item.name ?? "unknown"}`;
  const priority = context.internalPriority;

  const existingTicket = await prisma.ticket.findUnique({
    where: { problemId: context.problemId },
    select: { id: true, status: true, zabbixStatus: true, title: true, description: true },
  });

  let ticketToUpdate: { id: string } | null = existingTicket;
  let ticketSnapshot = existingTicket;

  if (!ticketToUpdate && context.isRecoveryEvent) {
    const fallbackTicket = await resolveFallbackTicketForRecovery(context);
    if (fallbackTicket) {
      ticketToUpdate = { id: fallbackTicket.id };
      ticketSnapshot = null;
      console.warn("[zabbix] Recovery event matched via fallback ticket lookup", {
        eventId: context.event.id,
        problemEventId: context.problemEventId,
        triggerId: context.normalizedTriggerId,
        hostName: context.normalizedHostName,
        fallbackProblemId: fallbackTicket.problemId,
      });
    }
  }

  let updatedTicketId: string | null = null;
  const nextStatus = zabbixStatus === "PROBLEM" ? "OPEN" : "RESOLVED";

  if (ticketToUpdate) {
    if (!ticketSnapshot) {
      ticketSnapshot = await prisma.ticket.findUnique({
        where: { id: ticketToUpdate.id },
        select: { id: true, status: true, zabbixStatus: true, title: true, description: true },
      });
    }

    const changes: AuditChange[] = [];
    const statusChange = toAuditChange("status", ticketSnapshot?.status, nextStatus);
    const zabbixChange = toAuditChange("zabbixStatus", ticketSnapshot?.zabbixStatus, zabbixStatus);
    const titleChange = toAuditChange("title", ticketSnapshot?.title, title);
    const descriptionChange = toAuditChange(
      "description",
      ticketSnapshot?.description,
      description,
    );

    if (statusChange) changes.push(statusChange);
    if (zabbixChange) changes.push(zabbixChange);
    if (titleChange) changes.push(titleChange);
    if (descriptionChange) changes.push(descriptionChange);

    await prisma.ticket.update({
      where: { id: ticketToUpdate.id },
      data: {
        title,
        description,
        zabbixStatus,
        status: nextStatus,
      },
    });

    if (changes.length > 0) {
      changes.push({
        field: "source",
        oldValue: "",
        newValue: AUTO_AUDIT_SOURCE,
      });

      await prisma.audit.create({
        data: {
          entity: "Ticket",
          entityId: ticketToUpdate.id,
          action: "UPDATE",
          changes,
        },
      });
    }

    updatedTicketId = ticketToUpdate.id;
  } else {
    if (context.isRecoveryEvent) {
      console.warn("[zabbix] Recovery event received without matching problem ticket", {
        eventId: context.event.id,
        problemEventId: context.problemEventId,
        triggerId: context.normalizedTriggerId,
        hostName: context.normalizedHostName,
      });
      return { action: "skipped" };
    }

    const [ticketId, sla] = await Promise.all([
      generateTicketIdForWebhook(),
      prisma.sLA.findUnique({
        where: { priority },
      }),
    ]);

    if (!sla) {
      return { action: "skipped", error: `No SLA found for priority: ${priority}` };
    }

    const now = new Date();
    const responseDue = dayjs(now).add(sla.responseTime, "minute").toDate();
    const resolutionDue = dayjs(now).add(sla.resolutionTime, "minute").toDate();

    const createdTicket = await prisma.ticket.create({
      data: {
        ticketId,
        problemId: context.problemId,
        title,
        description,
        zabbixStatus,
        priority,
        resolutionDue,
        responseDue,
        status: "OPEN",
        creationMode: "AUTOMATIC",
      },
    });

    await prisma.audit.create({
      data: {
        entity: "Ticket",
        entityId: createdTicket.id,
        action: "CREATE",
        changes: [
          { field: "source", oldValue: "", newValue: AUTO_AUDIT_SOURCE },
          { field: "creationMode", oldValue: "", newValue: "AUTOMATIC" },
          { field: "status", oldValue: "", newValue: "OPEN" },
          { field: "zabbixStatus", oldValue: "", newValue: zabbixStatus },
        ],
      },
    });

    await invalidateCacheByPrefixes([
      HELPDESK_CACHE_PREFIXES.tickets,
      HELPDESK_CACHE_PREFIXES.overview,
      HELPDESK_CACHE_PREFIXES.departments,
      HELPDESK_CACHE_PREFIXES.analysis,
      HELPDESK_CACHE_PREFIXES.users,
    ]);

    return { action: "created", ticketId: createdTicket.id };
  }

  await invalidateCacheByPrefixes([
    HELPDESK_CACHE_PREFIXES.tickets,
    HELPDESK_CACHE_PREFIXES.overview,
    HELPDESK_CACHE_PREFIXES.departments,
    HELPDESK_CACHE_PREFIXES.analysis,
    HELPDESK_CACHE_PREFIXES.users,
  ]);

  return updatedTicketId
    ? { action: "updated", ticketId: updatedTicketId }
    : { action: "skipped" };
}
