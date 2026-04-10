import { WebhookContextResult, WebhookEvent, WebhookPayload } from "./types";
import { mapSeverityToPriority } from "./webhook-severity";
import {
  asRecord,
  firstNonEmptyText,
  normalizeOptionalText,
  normalizeRequiredText,
} from "./webhook-helpers";

function parseNumericId(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

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

    if (eventIdNum !== null && recoveryIdNum !== null && recoveryIdNum > eventIdNum) {
      return event.id;
    }

    return recoveryId;
  }

  return event.id;
}

export function buildWebhookContext(payload: WebhookPayload): WebhookContextResult {
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
  const status: "0" | "1" = recoveryEvent ? "1" : "0";
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
  const raw = asRecord(payload.raw);
  const alertSubject = firstNonEmptyText(payload.alert?.subject, payload.subject, raw?.subject);
  const alertMessage = firstNonEmptyText(payload.alert?.message, payload.message, raw?.message);

  return {
    data: {
      event,
      trigger,
      host,
      item,
      raw,
      normalizedTriggerId,
      normalizedHostName,
      clock,
      status,
      isRecoveryEvent: recoveryEvent,
      problemEventId,
      tagsString,
      last5Values,
      alertSubject,
      alertMessage,
      problemId: `zabbix-${problemEventId}`,
      internalPriority: mapSeverityToPriority(trigger.severity),
    },
  };
}
