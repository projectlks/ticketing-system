import { NextRequest } from "next/server";
import {
  ValidationError,
  WebhookEvent,
  WebhookHost,
  WebhookItem,
  WebhookParseResult,
  WebhookPayload,
  WebhookTag,
  WebhookTrigger,
} from "./types";
import {
  asRecord,
  firstNonEmptyText,
  getPathText,
  getPathValue,
  normalizeScalarText,
} from "./webhook-helpers";

function tryParseJson(value: string): unknown | null {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function formatWebhookBodyPreview(rawBody: string): string {
  const collapsed = rawBody.replace(/\s+/g, " ").trim();
  if (!collapsed) return "";
  return collapsed.length > 600 ? `${collapsed.slice(0, 600)}...` : collapsed;
}

function extractEmbeddedPayload(record: Record<string, unknown>): unknown | null {
  for (const key of ["payload", "data", "body"]) {
    const value = record[key];
    if (value === null || value === undefined) continue;

    if (typeof value === "string") {
      const parsed = tryParseJson(value);
      if (parsed !== null) return parsed;
      continue;
    }

    if (typeof value === "object" && !Array.isArray(value)) {
      return value;
    }
  }

  return null;
}

function hasEventIdentity(record: Record<string, unknown>): boolean {
  const eventRecord = asRecord(getPathValue(record, "event"));
  if (getPathText(eventRecord, "id")) return true;
  return Boolean(getPathText(record, "event.id", "event_id", "eventid"));
}

function parseWebhookBody(rawBody: string, contentType: string): { data?: unknown; error?: ValidationError } {
  const trimmed = rawBody.trim();
  if (!trimmed) {
    return {
      error: {
        message: "Empty webhook body",
        status: 400,
      },
    };
  }

  const parseAsJson = (): unknown | null => tryParseJson(trimmed);
  const parseAsForm = (): Record<string, string> | null => {
    if (!/[=&]/.test(trimmed)) return null;
    const params = new URLSearchParams(trimmed);
    const entries = Array.from(params.entries());
    if (!entries.length) return null;
    return Object.fromEntries(entries);
  };

  let parsed: unknown | null = null;

  if (contentType.includes("application/json")) {
    parsed = parseAsJson();
    if (parsed === null) {
      return {
        error: {
          message: "Invalid JSON body",
          status: 400,
        },
      };
    }
  } else if (contentType.includes("application/x-www-form-urlencoded")) {
    parsed = parseAsForm();
    if (parsed === null) {
      return {
        error: {
          message: "Invalid form-urlencoded webhook body",
          status: 400,
        },
      };
    }
  } else {
    parsed = parseAsJson() ?? parseAsForm();
    if (parsed === null) {
      return {
        error: {
          message: "Unsupported webhook body format. Send JSON or form-urlencoded payload.",
          status: 400,
        },
      };
    }
  }

  const parsedRecord = asRecord(parsed);
  if (parsedRecord && !hasEventIdentity(parsedRecord)) {
    const embeddedPayload = extractEmbeddedPayload(parsedRecord);
    if (embeddedPayload !== null) {
      parsed = embeddedPayload;
    }
  }

  return { data: parsed };
}

function normalizeIncomingTags(value: unknown): WebhookPayload["tags"] | undefined {
  if (Array.isArray(value)) {
    const normalizedObjectTags: WebhookTag[] = [];
    const normalizedTextTags: string[] = [];

    for (const entry of value) {
      const record = asRecord(entry);
      const tag = getPathText(record, "tag", "name", "key");
      const tagValue = getPathText(record, "value");

      if (tag && tagValue) {
        normalizedObjectTags.push({ tag, value: tagValue });
        continue;
      }

      const text = normalizeScalarText(entry);
      if (text) normalizedTextTags.push(text);
    }

    if (normalizedObjectTags.length > 0 && normalizedTextTags.length === 0) {
      return normalizedObjectTags;
    }

    const objectText = normalizedObjectTags.map((tag) => `${tag.tag}:${tag.value}`);
    const merged = [...objectText, ...normalizedTextTags].join(",");
    return merged.length > 0 ? merged : undefined;
  }

  const normalized = normalizeScalarText(value);
  return normalized ?? undefined;
}

function normalizeWebhookPayload(input: unknown): WebhookPayload | null {
  const record = asRecord(input);
  if (!record) return null;

  const eventRecord = asRecord(getPathValue(record, "event"));
  const triggerRecord = asRecord(getPathValue(record, "trigger"));
  const hostRecord = asRecord(getPathValue(record, "host"));
  const itemRecord = asRecord(getPathValue(record, "item"));
  const alertRecord = asRecord(getPathValue(record, "alert"));
  const rawRecord = asRecord(getPathValue(record, "raw")) ?? record;

  const eventId = firstNonEmptyText(
    getPathText(eventRecord, "id"),
    getPathText(record, "event.id", "event_id", "eventid"),
  );
  if (!eventId) return null;

  const fallbackDatetime = (() => {
    const eventDate = getPathText(record, "event_date", "date");
    const eventTime = getPathText(record, "event_time", "time");
    if (eventDate && eventTime) return `${eventDate} ${eventTime}`;
    return null;
  })();

  const event = {
    id: eventId,
    status: firstNonEmptyText(
      getPathText(eventRecord, "status"),
      getPathText(record, "event.status", "event_status", "trigger_status"),
    ) ?? undefined,
    value: firstNonEmptyText(
      getPathText(eventRecord, "value"),
      getPathText(record, "event.value", "event_value"),
    ) ?? undefined,
    datetime: firstNonEmptyText(
      getPathText(eventRecord, "datetime"),
      getPathText(record, "event.datetime", "event_datetime"),
      fallbackDatetime,
    ) ?? undefined,
    recovery_id: firstNonEmptyText(
      getPathText(eventRecord, "recovery_id"),
      getPathText(record, "event.recovery_id", "recovery_id"),
    ) ?? undefined,
    event_recovery_id: firstNonEmptyText(
      getPathText(eventRecord, "event_recovery_id"),
      getPathText(record, "event.event_recovery_id", "event_recovery_id"),
    ) ?? undefined,
    recoveryEventId: firstNonEmptyText(
      getPathText(eventRecord, "recoveryEventId"),
      getPathText(record, "event.recoveryEventId", "recoveryEventId"),
    ) ?? undefined,
    r_eventid: firstNonEmptyText(
      getPathText(eventRecord, "r_eventid"),
      getPathText(record, "event.r_eventid", "r_eventid"),
    ) ?? undefined,
  } satisfies WebhookEvent;

  const trigger = {
    id: firstNonEmptyText(
      getPathText(triggerRecord, "id"),
      getPathText(record, "trigger.id", "trigger_id", "triggerid"),
    ) ?? undefined,
    name: firstNonEmptyText(
      getPathText(triggerRecord, "name"),
      getPathText(record, "trigger.name", "trigger_name", "event_name"),
    ) ?? undefined,
    description: firstNonEmptyText(
      getPathText(triggerRecord, "description"),
      getPathText(record, "trigger.description", "trigger_description"),
    ) ?? undefined,
    status: firstNonEmptyText(
      getPathText(triggerRecord, "status"),
      getPathText(record, "trigger.status", "trigger_status"),
    ) ?? undefined,
    severity: firstNonEmptyText(
      getPathText(triggerRecord, "severity"),
      getPathText(record, "trigger.severity", "event_severity", "severity"),
    ) ?? undefined,
  } satisfies WebhookTrigger;

  const host = {
    id: firstNonEmptyText(
      getPathText(hostRecord, "id"),
      getPathText(record, "host.id", "host_id", "hostid"),
    ) ?? undefined,
    name: firstNonEmptyText(
      getPathText(hostRecord, "name"),
      getPathText(record, "host.name", "host_name", "hostname"),
    ) ?? undefined,
    ip: firstNonEmptyText(
      getPathText(hostRecord, "ip"),
      getPathText(record, "host.ip", "host_ip"),
    ) ?? undefined,
    group: firstNonEmptyText(
      getPathText(hostRecord, "group"),
      getPathText(record, "host.group", "host_group", "trigger_hostgroup_name"),
    ) ?? undefined,
    inventory_tag: firstNonEmptyText(
      getPathText(hostRecord, "inventory_tag"),
      getPathText(record, "host.inventory_tag", "inventory_tag", "host_tag"),
    ) ?? undefined,
  } satisfies WebhookHost;

  const item = {
    id: firstNonEmptyText(
      getPathText(itemRecord, "id"),
      getPathText(record, "item.id", "item_id", "itemid", "item_id1"),
    ) ?? undefined,
    name: firstNonEmptyText(
      getPathText(itemRecord, "name"),
      getPathText(record, "item.name", "item_name", "item_name1"),
    ) ?? undefined,
    key: firstNonEmptyText(
      getPathText(itemRecord, "key"),
      getPathText(record, "item.key", "item_key", "item_key1"),
    ) ?? undefined,
    value: firstNonEmptyText(
      getPathText(itemRecord, "value"),
      getPathText(record, "item.value", "item_value", "item_lastvalue", "item_value_1"),
    ) ?? undefined,
  } satisfies WebhookItem;

  const alertSubject = firstNonEmptyText(
    getPathText(alertRecord, "subject"),
    getPathText(record, "alert.subject", "subject", "alert_subject"),
  );
  const alertMessage = firstNonEmptyText(
    getPathText(alertRecord, "message"),
    getPathText(record, "alert.message", "message", "alert_message"),
  );
  const alertSendto = firstNonEmptyText(
    getPathText(alertRecord, "sendto"),
    getPathText(record, "alert.sendto", "sendto"),
  );

  const tags =
    normalizeIncomingTags(getPathValue(record, "tags")) ??
    normalizeIncomingTags(getPathText(record, "event_tags", "event_tags_json"));

  const eventRecoveryId = firstNonEmptyText(
    getPathText(record, "event_recovery_id", "recovery_event_id", "recoveryEventId"),
    event.event_recovery_id,
    event.recovery_id,
    event.recoveryEventId,
    event.r_eventid,
  );

  const payload: WebhookPayload = {
    event,
    raw: rawRecord,
  };

  if (trigger.id || trigger.name || trigger.description || trigger.status || trigger.severity) {
    payload.trigger = trigger;
  }
  if (host.id || host.name || host.ip || host.group || host.inventory_tag) {
    payload.host = host;
  }
  if (item.id || item.name || item.key || item.value) {
    payload.item = item;
  }

  if (alertSubject || alertMessage || alertSendto) {
    payload.alert = {
      subject: alertSubject ?? undefined,
      message: alertMessage ?? undefined,
      sendto: alertSendto ?? undefined,
    };
  }

  if (alertSubject) payload.subject = alertSubject;
  if (alertMessage) payload.message = alertMessage;
  if (tags) payload.tags = tags;

  if (eventRecoveryId) {
    payload.event_recovery_id = eventRecoveryId;
    payload.recovery_event_id = eventRecoveryId;
    payload.recoveryEventId = eventRecoveryId;
  }

  return payload;
}

export async function parseIncomingWebhookPayload(req: NextRequest): Promise<WebhookParseResult> {
  const contentType = req.headers.get("content-type")?.toLowerCase() ?? "";
  const rawBody = await req.text();
  const bodyPreview = formatWebhookBodyPreview(rawBody);

  const bodyResult = parseWebhookBody(rawBody, contentType);
  if (bodyResult.error || !bodyResult.data) {
    return {
      error:
        bodyResult.error ?? {
          message: "Invalid webhook body",
          status: 400,
        },
      contentType,
      bodyPreview,
    };
  }

  const normalizedPayload = normalizeWebhookPayload(bodyResult.data);
  if (!normalizedPayload) {
    return {
      error: {
        message:
          "Unsupported webhook payload schema. Require event.id (or event_id/eventid) plus JSON/form body.",
        status: 400,
      },
      contentType,
      bodyPreview,
    };
  }

  return {
    payload: normalizedPayload,
    contentType,
    bodyPreview,
  };
}
