import { NormalizedWebhookContext } from "./types";
import { getRawText, normalizeOptionalText } from "./webhook-helpers";

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDateUTC(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

function formatTimeUTC(date: Date): string {
  return `${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(date.getUTCSeconds())}`;
}

function resolveZabbixWebBaseUrl(raw: Record<string, unknown> | null): string {
  const fromPayload = getRawText(raw, "zabbix_url", "zabbixBaseUrl");
  if (fromPayload) return fromPayload.replace(/\/+$/, "");

  const apiUrl = process.env.ZABBIX_URL?.trim();
  if (!apiUrl) return "";

  try {
    const parsed = new URL(apiUrl);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return "";
  }
}

export function buildMandatoryArticleSubject(context: NormalizedWebhookContext): string {
  const { raw } = context;
  const triggerClient =
    getRawText(raw, "host_tag", "inventory_tag") ??
    normalizeOptionalText(context.host.inventory_tag) ??
    "*UNKNOWN*";
  const hostName = getRawText(raw, "host_name") ?? context.normalizedHostName;
  const eventName = getRawText(raw, "event_name", "trigger_name") ?? context.trigger.name ?? "-";
  const recoveryName = getRawText(raw, "event_recovery_name", "r_event_name") ?? eventName;
  const triggerStatus = (
    getRawText(raw, "trigger_status", "event_status") ??
    context.trigger.status ??
    "PROBLEM"
  ).toUpperCase();

  if (context.isRecoveryEvent) {
    return `${triggerClient} - Recovered: ${recoveryName} on ${hostName}`;
  }

  return `${triggerClient} - ${triggerStatus}: ${eventName} on ${hostName}`;
}

function buildMandatoryArticleBody(context: NormalizedWebhookContext): string {
  const { raw } = context;

  const eventDate = getRawText(raw, "event_date") ?? formatDateUTC(context.clock);
  const eventTime = getRawText(raw, "event_time") ?? formatTimeUTC(context.clock);
  const recoveryDate = getRawText(raw, "event_recovery_date", "r_event_date") ?? eventDate;
  const recoveryTime = getRawText(raw, "event_recovery_time", "r_event_time") ?? eventTime;
  const eventCreatedDate = getRawText(raw, "date") ?? eventDate;
  const eventCreatedTime = getRawText(raw, "time") ?? eventTime;

  const triggerClient =
    getRawText(raw, "host_tag", "inventory_tag") ??
    normalizeOptionalText(context.host.inventory_tag) ??
    "*UNKNOWN*";
  const triggerGroups =
    getRawText(raw, "host_group", "trigger_hostgroup_name") ??
    normalizeOptionalText(context.host.group) ??
    "-";
  const hostName = getRawText(raw, "host_name") ?? context.normalizedHostName;
  const triggerName = getRawText(raw, "event_name", "trigger_name") ?? context.trigger.name ?? "-";
  const recoveryName = getRawText(raw, "event_recovery_name", "r_event_name") ?? triggerName;
  const triggerDescription = getRawText(raw, "trigger_description") ?? context.trigger.description ?? "-";
  const triggerStatus = getRawText(raw, "trigger_status") ?? context.trigger.status ?? "-";
  const triggerSeverity = getRawText(raw, "event_severity") ?? context.trigger.severity ?? "-";
  const triggerExpression = getRawText(raw, "trigger_expression") ?? "-";
  const triggerId = getRawText(raw, "trigger_id") ?? context.trigger.id ?? "-";
  const itemName = getRawText(raw, "item_name", "item_name1") ?? context.item.name ?? "-";
  const itemId = getRawText(raw, "item_id", "item_id1") ?? context.item.id ?? "-";
  const itemDescription = getRawText(raw, "item_description") ?? "-";
  const eventTags = getRawText(raw, "event_tags", "event_tags_json") ?? context.tagsString ?? "-";
  const actionName = getRawText(raw, "action_name") ?? "-";
  const eventAge = getRawText(raw, "event_age", "event_duration") ?? "-";
  const ackStatus = getRawText(raw, "event_ack_status") ?? "-";
  const ackHistory = getRawText(raw, "event_update_history", "event_ack_history") ?? "-";
  const itemKey1 = getRawText(raw, "item_key1", "item_key") ?? context.item.key ?? "-";
  const hostName1 = getRawText(raw, "host_name1") ?? hostName;
  const itemName1 = getRawText(raw, "item_name1", "item_name") ?? itemName;
  const ciName = `[${triggerClient}] [${hostName}] ${itemName1}  ${eventTags}`;
  const v1 = getRawText(raw, "item_value_1", "item_lastvalue", "item_value") ?? "-";
  const v2 = getRawText(raw, "item_value_2") ?? "-";
  const v3 = getRawText(raw, "item_value_3") ?? "-";
  const v4 = getRawText(raw, "item_value_4") ?? "-";
  const v5 = getRawText(raw, "item_value_5") ?? "-";

  const zabbixWeb = resolveZabbixWebBaseUrl(raw);
  const itemGraph = zabbixWeb
    ? `${zabbixWeb}/history.php?action=showgraph&itemids%5B%5D=${itemId}`
    : "-";
  const itemHistory = zabbixWeb
    ? `${zabbixWeb}/history.php?action=showvalues&itemids%5B%5D=${itemId}`
    : "-";
  const graphDirect = zabbixWeb ? `${zabbixWeb}/chart.php?itemids%5B%5D=${itemId}` : "-";
  const eventDetail = zabbixWeb
    ? `${zabbixWeb}/tr_events.php?triggerid=${triggerId}&eventid=${context.event.id}`
    : "-";

  if (context.isRecoveryEvent) {
    return [
      `Problem has been resolved at ${recoveryTime} on ${recoveryDate}`,
      `Trigger client: ${triggerClient}`,
      `Trigger groups: ${triggerGroups}`,
      `Hostname: ${hostName}`,
      `Trigger: ${recoveryName}`,
      `Trigger description: ${triggerDescription}`,
      "Trigger status: Recovered",
      `Trigger severity: ${triggerSeverity}`,
      `Trigger expression: ${triggerExpression}`,
      `Trigger ID: ${triggerId}`,
      `ItemName: ${itemName}`,
      `Item ID: ${itemId}`,
      `Item description: ${itemDescription}`,
      `CIName: ${ciName}`,
      "----",
      eventTags,
      `Original event ID: ${context.event.id} by ${eventDate} ${eventTime}`,
      `Action Name: ${actionName}`,
      `Event age: ${eventAge}`,
      `Event ack status: ${ackStatus}`,
      "ACK History:",
      ackHistory,
      `Event created: ${eventCreatedDate} ${eventCreatedTime}`,
      "Last 5 Item values:",
      `${itemName1} (${hostName1}:${itemKey1}):`,
      `1: ${v1}`,
      `2: ${v2}`,
      `3: ${v3}`,
      `4: ${v4}`,
      `5: ${v5}`,
      `Item graph: "${itemGraph}"`,
      `Item history: "${itemHistory}"`,
      `Graph direct image: ${graphDirect}`,
      `Event Detail: "${eventDetail}"`,
    ].join("\n");
  }

  return [
    `Problem started at ${eventTime} on ${eventDate}`,
    `Trigger client: ${triggerClient}`,
    `Trigger groups: ${triggerGroups}`,
    `Hostname: ${hostName}`,
    `Trigger: ${triggerName}`,
    `Trigger description: ${triggerDescription}`,
    `Trigger status: ${triggerStatus}`,
    `Trigger severity: ${triggerSeverity}`,
    `Trigger expression: ${triggerExpression}`,
    `Trigger ID: ${triggerId}`,
    `ItemName: ${itemName}`,
    `Item ID: ${itemId}`,
    `Item description: ${itemDescription}`,
    `CIName: ${ciName}`,
    "----",
    eventTags,
    `Original event ID: ${context.event.id}`,
    `Event created: ${eventCreatedDate} ${eventCreatedTime}`,
    `Action Name: ${actionName}`,
    "Last 5 Item values:",
    `${itemName1} (${hostName1}:${itemKey1}):`,
    `1: ${v1}`,
    `2: ${v2}`,
    `3: ${v3}`,
    `4: ${v4}`,
    `5: ${v5}`,
    `Item graph: "${itemGraph}"`,
    `Item history: "${itemHistory}"`,
    `Graph direct image: ${graphDirect}`,
    `Event Detail: "${eventDetail}"`,
  ].join("\n");
}

export function ensureMandatoryArticleBody(
  incomingMessage: string | null,
  context: NormalizedWebhookContext,
): string {
  const requiredBody = buildMandatoryArticleBody(context);
  if (!incomingMessage) return requiredBody;

  const mustContain = context.isRecoveryEvent
    ? [
      "Problem has been resolved at",
      "Trigger client:",
      "Trigger groups:",
      "Original event ID:",
      "Last 5 Item values:",
      "Event Detail:",
    ]
    : [
      "Problem started at",
      "Trigger client:",
      "Trigger groups:",
      "Original event ID:",
      "Last 5 Item values:",
      "Event Detail:",
    ];

  const hasAll = mustContain.every((token) => incomingMessage.includes(token));
  if (hasAll) return incomingMessage;
  return requiredBody;
}
