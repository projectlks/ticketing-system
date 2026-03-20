import { NextRequest, NextResponse } from "next/server";
import { Priority, Status, ZabbixStatus } from "@/generated/prisma/client";
import { prisma } from "@/libs/prisma";
import dayjs from "@/libs/dayjs";
import { HELPDESK_CACHE_PREFIXES } from "@/app/helpdesk/cache/redis-keys";
import { invalidateCacheByPrefixes } from "@/libs/redis-cache";
import { emitAlertsChanged, emitTicketsChanged } from "@/libs/socket-emitter";

const DEFAULT_CUSTOMER_EMAIL = "support@eastwindmyanmar.com.mm";
const APP_PORT = process.env.PORT?.trim() || "4000";
const LOCAL_CREATE_TICKET_URL =
  process.env.LOCAL_CREATE_TICKET_URL?.trim() ||
  `http://127.0.0.1:${APP_PORT}/api/create-ticket`;

type WebhookTag = {
  tag: string;
  value: string;
};

type WebhookEvent = {
  id: string;
  status?: string;
  value?: string;
  datetime?: string;
  recovery_id?: string;
  event_recovery_id?: string;
  recoveryEventId?: string;
  r_eventid?: string;
};

type WebhookTrigger = {
  id?: string;
  name?: string;
  description?: string;
  status?: string;
  severity?: string;
};

type WebhookHost = {
  id?: string;
  name?: string;
  ip?: string;
  group?: string;
  inventory_tag?: string;
};

type WebhookItem = {
  id?: string;
  name?: string;
  key?: string;
  value?: string;
};

type WebhookPayload = {
  event: WebhookEvent;
  trigger?: WebhookTrigger;
  host?: WebhookHost;
  item?: WebhookItem;
  tags?: WebhookTag[] | string;
  event_recovery_id?: string;
  recovery_event_id?: string;
  recoveryEventId?: string;
};

type CreateTicketResponse = {
  action?: "created" | "updated" | "skipped" | "failed";
  ticketId?: string | number;
  error?: string;
  reason?: string;
  otrsError?: {
    code?: string | null;
    message?: string;
  };
  data?: {
    TicketID?: string | number;
    Error?: {
      ErrorMessage?: string;
      ErrorCode?: string;
    };
  };
};

type CreateTicketCallResult = {
  url: string;
  status: number;
  data: CreateTicketResponse;
};

type OtrsSyncResult =
  | { action: "ok" }
  | {
    action: "skipped";
    reason: string | null;
  };

type NormalizedWebhookContext = {
  event: WebhookEvent;
  trigger: WebhookTrigger;
  host: WebhookHost;
  item: WebhookItem;
  normalizedTriggerId: string;
  normalizedHostName: string;
  clock: Date;
  status: "0" | "1";
  isRecoveryEvent: boolean;
  problemEventId: string;
  tagsString: string | null;
  last5Values: string | null;
  problemId: string;
  internalPriority: Priority;
};

type ValidationError = {
  message: string;
  status: number;
};

type WebhookContextResult = {
  data?: NormalizedWebhookContext;
  error?: ValidationError;
};

/* -------------------------------------------------------------------------- */
/*                         Generic normalization helpers                        */
/* -------------------------------------------------------------------------- */

// OTRS API response ထဲက TicketID field ဟာ number/string အမျိုးမျိုးပြန်လာနိုင်လို့
// DB ထဲသိမ်းမယ့်အချိန် string တစ်မျိုးတည်းပဲအသုံးပြုနိုင်အောင် normalize လုပ်ထားသည်။
function normalizeTicketId(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

// Null/empty string များကြောင့် composite key မပျက်စီးအောင် fallback ဖြင့် normalize လုပ်သည်။
function normalizeRequiredText(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseNumericId(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

// Zabbix datetime format (`YYYY.MM.DD HH:mm:ss`) နဲ့ ISO format နှစ်မျိုးလုံးကို လက်ခံပြီး
// DB Date column အတွက် canonical Date object ပြောင်းပေးသည်။
function parseWebhookDatetime(value: string | undefined): Date | null {
  if (!value) return new Date();

  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;

  const matched = value.match(/^(\d{4})\.(\d{2})\.(\d{2})\s?(\d{2}:\d{2}:\d{2})$/);
  if (!matched) return null;

  const [, year, month, day, time] = matched;
  const normalized = `${year}-${month}-${day}T${time}Z`;
  const reparsed = new Date(normalized);

  return Number.isNaN(reparsed.getTime()) ? null : reparsed;
}

function normalizeTags(tags: WebhookPayload["tags"]): string | null {
  if (Array.isArray(tags)) {
    return tags.map((entry) => `${entry.tag}:${entry.value}`).join(",");
  }

  if (typeof tags === "string") return tags;
  return null;
}

function mapSeverityToPriority(severity: string | undefined): Priority {
  switch (severity?.toLowerCase()) {
    case "disaster":
    case "high":
      return "CRITICAL";
    case "average":
      return "MAJOR";
    case "warning":
      return "MINOR";
    default:
      return "REQUEST";
  }
}

function mapSeverityToOtrsPriorityLabel(severity: string | undefined): string {
  const severityMap: Record<string, string> = {
    Disaster: "1 Critical",
    High: "2 High",
    Average: "3 Medium",
    Warning: "4 Low",
    Information: "5 Very Low",
  };

  return severity ? (severityMap[severity] ?? "3 Medium") : "3 Medium";
}

function isResolvedEvent(event: WebhookEvent): boolean {
  return event.status?.toLowerCase() === "resolved" || event.value === "0";
}

function resolveProblemEventId(payload: WebhookPayload): string | null {
  const event = payload.event;
  if (!event?.id) return null;

  if (!isResolvedEvent(event)) return event.id;

  const recoveryCandidates: unknown[] = [
    event.event_recovery_id,
    event.recovery_id,
    event.recoveryEventId,
    event.r_eventid,
    payload.event_recovery_id,
    payload.recovery_event_id,
    payload.recoveryEventId,
  ];

  let recoveryId: string | null = null;
  for (const candidate of recoveryCandidates) {
    const normalized = normalizeOptionalText(candidate);
    if (normalized) {
      recoveryId = normalized;
      break;
    }
  }

  if (recoveryId) {
    const eventIdNum = parseNumericId(event.id);
    const recoveryIdNum = parseNumericId(recoveryId);

    // Heuristic: if recoveryId looks newer than event.id, treat event.id as the problem id
    // (covers recovery operations where {EVENT.ID} points to the problem event).
    if (eventIdNum !== null && recoveryIdNum !== null && recoveryIdNum > eventIdNum) {
      return event.id;
    }

    return recoveryId;
  }

  return event.id;
}

/* -------------------------------------------------------------------------- */
/*                    Request parsing + validation layer                        */
/* -------------------------------------------------------------------------- */

// POST route တစ်လမ်းလုံးအသုံးပြုမယ့် "single source of truth" context ကိုတည်ဆောက်သည်။
// ဒီ function မှာ validation/normalization ပြီးသွားတာကြောင့် နောက်ပိုင်း helper များတွင်
// duplicate null-check မလိုတော့ဘဲ logic ရှင်းလင်းစေသည်။
function buildWebhookContext(payload: WebhookPayload): WebhookContextResult {
  const event = payload.event;
  const trigger = payload.trigger ?? {};
  const host = payload.host ?? {};
  const item = payload.item ?? {};

  if (!event?.id) {
    return { error: { message: "Missing event id", status: 400 } };
  }

  const clock = parseWebhookDatetime(event.datetime);
  if (!clock) {
    return { error: { message: "Invalid event datetime", status: 400 } };
  }

  const normalizedTriggerId = normalizeRequiredText(trigger.id, `unknown-trigger-${event.id}`);
  const normalizedHostName = normalizeRequiredText(host.name, "unknown-host");

  const recoveryEvent = isResolvedEvent(event);
  const status: "0" | "1" = recoveryEvent ? "1" : "0"; // 0 = PROBLEM, 1 = RESOLVED
  const problemEventId = resolveProblemEventId(payload);
  if (!problemEventId) {
    return {
      error: {
        message: "Missing event_recovery_id for resolved event. Configure webhook to send recovery link.",
        status: 400,
      },
    };
  }

  const tagsString = normalizeTags(payload.tags);
  const last5Values = item.value ? `1: ${item.value} (${item.name ?? ""})` : null;

  return {
    data: {
      event,
      trigger,
      host,
      item,
      normalizedTriggerId,
      normalizedHostName,
      clock,
      status,
      isRecoveryEvent: recoveryEvent,
      problemEventId,
      tagsString,
      last5Values,
      problemId: `zabbix-${problemEventId}`,
      internalPriority: mapSeverityToPriority(trigger.severity),
    },
  };
}
/* -------------------------------------------------------------------------- */
/*                       DB sync helpers (Zabbix + Ticket)                      */
/* -------------------------------------------------------------------------- */

// Webhook ကနေ auto-create ဖြစ်လာတဲ့ ticket တွေကို ဘယ် user အောက်မှာပိုင်မလဲဆိုတာ
// သတ်မှတ်ပေးသည့် policy function ဖြစ်သည်။
async function generateTicketIdForWebhook(): Promise<string> {
  // Local generator keeps webhook route independent from server action modules.
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

// Zabbix raw events ကို event_id အလိုက် idempotent upsert လုပ်ပြီး event history မပျောက်အောင်ထားသည်။
type ZabbixUpsertAction = "created" | "updated";

async function upsertZabbixSnapshot(
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

  // Recovery events should not overwrite the original problem start time.
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

// Application internal ticket table ကို zabbix problemId နဲ့ idempotent upsert လုပ်သည်။
// requesterId ကို optional fallback strategy နဲ့ resolve လုပ်ပြီး required relation error မဖြစ်စေသည်။
type InternalTicketUpsertResult = {
  action: "created" | "updated" | "skipped";
  ticketId?: string;
  error?: string;
};

type AuditChange = {
  field: string;
  oldValue: string;
  newValue: string;
};

type RecoveryFallbackTicket = {
  id: string;
  problemId: string | null;
};

const AUTO_AUDIT_SOURCE = "Zabbix";

function toAuditChange(field: string, oldValue: unknown, newValue: unknown): AuditChange | null {
  const from = oldValue === undefined || oldValue === null ? "" : String(oldValue);
  const to = newValue === undefined || newValue === null ? "" : String(newValue);
  if (from === to) return null;
  return { field, oldValue: from, newValue: to };
}

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

async function upsertInternalHelpdeskTicket(
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
/* -------------------------------------------------------------------------- */
/*                     create-ticket API integration helpers                    */
/* -------------------------------------------------------------------------- */

// OTRS bridge endpoint (/api/create-ticket) ကိုခေါ်ရန် payload structure တစ်နေရာတည်းမှာစုထားသည်။
// Field mapping ပြောင်းလဲလိုအပ်လာတဲ့အချိန် POST handler ကိုမထိခိုက်ဘဲ ဒီ function ပဲပြင်နိုင်သည်။
function buildCreateTicketPayload(context: NormalizedWebhookContext) {
  const ticketState =
    context.event.status?.toLowerCase() === "resolved" || context.event.value === "0"
      ? "recovery"
      : "new";

  return {
    Ticket: {
      Title: context.trigger.name ?? "Monitoring Problem",
      QueueID: "96",
      Service: "CEIR",
      State: ticketState,
      Priority: mapSeverityToOtrsPriorityLabel(context.trigger.severity),
      Type: "Incident",
      CustomerUser: DEFAULT_CUSTOMER_EMAIL,
    },
    DynamicField: [
      {
        Name: "ZabbixState",
        Value: context.status === "0" ? "PROBLEM" : "Recovered",
      },
      {
        Name: "ZabbixTrigger",
        Value: context.trigger.id ?? "",
      },
      {
        Name: "ZabbixEvent",
        Value: context.event.id,
      },
      {
        Name: "ZabbixHost",
        Value: context.host.name ?? "",
      },
    ],
    EventTime: context.event.datetime ?? new Date().toISOString(),
    TriggerClient: context.host.inventory_tag ?? "",
    TriggerGroups: context.host.group ?? "",
  };
}

async function callCreateTicket(
  url: string,
  payload: unknown,
): Promise<{ data?: CreateTicketCallResult; error?: string }> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.includes("application/json")) {
      return {
        error: `create-ticket returned non-JSON from ${url} (status ${response.status}): ${responseText.slice(0, 160)}`,
      };
    }

    let parsed: CreateTicketResponse;
    try {
      parsed = JSON.parse(responseText) as CreateTicketResponse;
    } catch (error) {
      return { error: `create-ticket returned invalid JSON: ${String(error)}` };
    }

    return {
      data: {
        url,
        status: response.status,
        data: parsed,
      },
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function resolvePrimaryCreateTicketUrl(requestOrigin?: string): string {
  if (!requestOrigin) return LOCAL_CREATE_TICKET_URL;

  try {
    const resolved = new URL("/api/create-ticket", requestOrigin);
    return resolved.toString();
  } catch {
    return LOCAL_CREATE_TICKET_URL;
  }
}

async function callCreateTicketWithFallback(
  payload: unknown,
  requestOrigin?: string,
): Promise<{ data?: CreateTicketCallResult; error?: string }> {
  const primaryCreateTicketUrl = resolvePrimaryCreateTicketUrl(requestOrigin);

  const primaryResult = await callCreateTicket(primaryCreateTicketUrl, payload);
  if (!primaryResult.error) {
    return primaryResult;
  }

  if (primaryCreateTicketUrl === LOCAL_CREATE_TICKET_URL) {
    return { error: primaryResult.error };
  }

  console.error("[zabbix] create-ticket primary call failed, retrying localhost", {
    primaryCreateTicketUrl,
    reason: primaryResult.error,
  });

  const fallbackResult = await callCreateTicket(LOCAL_CREATE_TICKET_URL, payload);
  if (fallbackResult.error) {
    return { error: fallbackResult.error };
  }

  return fallbackResult;
}
function resolveCreateTicketError(ticketData: CreateTicketResponse, statusCode: number): string | null {
  return (
    ticketData.error ??
    ticketData.otrsError?.message ??
    ticketData.data?.Error?.ErrorMessage ??
    (statusCode >= 400 ? `create-ticket status ${statusCode}` : null)
  );
}

async function persistOtrsTicketId(context: NormalizedWebhookContext, otrsTicketId: string) {
  await prisma.zabbixTicket.update({
    where: {
      eventid: context.event.id,
    },
    data: { otrsTicketId },
  });
}

// OTRS side-effect flow (build payload -> call API -> inspect response -> persist TicketID)
// ကိုစုစည်းထားသော orchestration helper ဖြစ်သည်။
async function syncOtrsTicket(
  context: NormalizedWebhookContext,
  requestOrigin?: string,
): Promise<{ data?: OtrsSyncResult; error?: string }> {
  const createTicketPayload = buildCreateTicketPayload(context);
  const createTicketResult = await callCreateTicketWithFallback(
    createTicketPayload,
    requestOrigin,
  );

  if (createTicketResult.error || !createTicketResult.data) {
    return {
      error: createTicketResult.error ?? "create-ticket request failed",
    };
  }

  const ticketData = createTicketResult.data.data;

  if (ticketData.action === "skipped") {
    return {
      data: {
        action: "skipped",
        reason: ticketData.reason ?? null,
      },
    };
  }

  const createTicketErrorMessage = resolveCreateTicketError(
    ticketData,
    createTicketResult.data.status,
  );
  if (createTicketErrorMessage) {
    const errorCode =
      ticketData.otrsError?.code ?? ticketData.data?.Error?.ErrorCode;
    return {
      error: errorCode
        ? `${createTicketErrorMessage} (${errorCode})`
        : createTicketErrorMessage,
    };
  }

  const otrsTicketId =
    normalizeTicketId(ticketData.data?.TicketID) ??
    normalizeTicketId(ticketData.ticketId);

  if (otrsTicketId) {
    await persistOtrsTicketId(context, otrsTicketId);
  } else {
    console.warn("[zabbix] create-ticket succeeded but no TicketID returned", {
      action: ticketData.action,
      eventId: context.event.id,
    });
  }

  return { data: { action: "ok" } };
}
/* -------------------------------------------------------------------------- */
/*                                 Route handler                               */
/* -------------------------------------------------------------------------- */

export async function POST(req: NextRequest) {
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;




  try {
    const payload = (await req.json()) as WebhookPayload;

    console.log(payload)

    console.info("[zabbix] webhook received", {
      payload : JSON.stringify(payload),
    });
    const contextResult = buildWebhookContext(payload);
    if (contextResult.error || !contextResult.data) {
      return NextResponse.json(
        {
          success: false,
          error: contextResult.error?.message ?? "Invalid webhook payload",
        },
        { status: contextResult.error?.status ?? 400 },
      );
    }

    const context = contextResult.data;

    // အဆင့် (1): Zabbix snapshot table ကို အရင် sync လုပ်ပြီး raw monitoring source ကိုညှိထားသည်။
    const alertsAction = await upsertZabbixSnapshot(context);
    await invalidateCacheByPrefixes([HELPDESK_CACHE_PREFIXES.alerts]);
    emitAlertsChanged({
      action: alertsAction,
      eventId: context.event.id,
      problemId: context.problemId,
      status: context.status,
      at: new Date().toISOString(),
    });

    // အဆင့် (2): Internal ticket table ကို problemId အခြေခံ idempotent upsert လုပ်သည်။
    const internalResult = await upsertInternalHelpdeskTicket(context);
    if (internalResult.error) {
      console.error("[zabbix] internal ticket sync failed", {
        requestId,
        message: internalResult.error,
      });
      return NextResponse.json(
        {
          success: false,
          error: internalResult.error,
          requestId,
        },
        { status: 500 },
      );
    }
    if (internalResult.action !== "skipped" && internalResult.ticketId) {
      emitTicketsChanged({
        action: internalResult.action,
        ticketId: internalResult.ticketId,
        eventId: context.event.id,
        problemId: context.problemId,
        status: context.status,
        at: new Date().toISOString(),
      });
    }

    // အဆင့် (3): OTRS sync flow ကိုသီးခြား helper မှာချုပ်ပြီး POST ကို orchestration only ထားသည်။
    const otrsResult = await syncOtrsTicket(context, req.nextUrl.origin);
    if (otrsResult.error) {
      console.error("[zabbix] OTRS sync failed", {
        requestId,
        message: otrsResult.error,
      });
      return NextResponse.json(
        {
          success: false,
          error: otrsResult.error,
          requestId,
        },
        { status: 502 },
      );
    }

    if (otrsResult.data?.action === "skipped") {
      return NextResponse.json({
        success: true,
        action: "skipped",
        reason: otrsResult.data.reason,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[zabbix] webhook processing failed", {
      requestId,
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      failedAt: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        requestId,
      },
      { status: 500 },
    );
  }
}
