import { Priority } from "@/generated/prisma/client";

/**
 * This file intentionally keeps all shared Zabbix webhook types in one place.
 *
 * Why this helps:
 * 1) Route orchestration code stays short and readable.
 * 2) Parse/normalize/sync modules can share a single contract.
 * 3) Future field changes only need to be updated once.
 */

export type WebhookTag = {
  tag: string;
  value: string;
};

export type WebhookEvent = {
  id: string;
  status?: string;
  value?: string;
  datetime?: string;
  recovery_id?: string;
  event_recovery_id?: string;
  recoveryEventId?: string;
  r_eventid?: string;
};

export type WebhookTrigger = {
  id?: string;
  name?: string;
  description?: string;
  status?: string;
  severity?: string;
};

export type WebhookHost = {
  id?: string;
  name?: string;
  ip?: string;
  group?: string;
  inventory_tag?: string;
};

export type WebhookItem = {
  id?: string;
  name?: string;
  key?: string;
  value?: string;
};

export type WebhookAlert = {
  subject?: string;
  message?: string;
  sendto?: string;
};

export type WebhookPayload = {
  event: WebhookEvent;
  trigger?: WebhookTrigger;
  host?: WebhookHost;
  item?: WebhookItem;
  alert?: WebhookAlert;
  subject?: string;
  message?: string;
  raw?: Record<string, unknown>;
  tags?: WebhookTag[] | string;
  event_recovery_id?: string;
  recovery_event_id?: string;
  recoveryEventId?: string;
};

export type CreateTicketResponse = {
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

export type CreateTicketCallResult = {
  url: string;
  status: number;
  data: CreateTicketResponse;
};

export type OtrsSyncResult =
  | { action: "ok" }
  | {
    action: "skipped";
    reason: string | null;
  };

/**
 * Canonical context used after webhook parse + validation.
 *
 * Every downstream module (DB sync + OTRS sync) consumes this shape,
 * so they do not need to re-validate nullable fields repeatedly.
 */
export type NormalizedWebhookContext = {
  event: WebhookEvent;
  trigger: WebhookTrigger;
  host: WebhookHost;
  item: WebhookItem;
  raw: Record<string, unknown> | null;
  normalizedTriggerId: string;
  normalizedHostName: string;
  clock: Date;
  status: "0" | "1";
  isRecoveryEvent: boolean;
  problemEventId: string;
  tagsString: string | null;
  last5Values: string | null;
  alertSubject: string | null;
  alertMessage: string | null;
  problemId: string;
  internalPriority: Priority;
};

export type ValidationError = {
  message: string;
  status: number;
};

export type WebhookContextResult = {
  data?: NormalizedWebhookContext;
  error?: ValidationError;
};

export type WebhookParseResult = {
  payload?: WebhookPayload;
  error?: ValidationError;
  contentType: string;
  bodyPreview: string;
};

export type ZabbixUpsertAction = "created" | "updated";

export type InternalTicketUpsertResult = {
  action: "created" | "updated" | "skipped";
  ticketId?: string;
  error?: string;
};

export type AuditChange = {
  field: string;
  oldValue: string;
  newValue: string;
};

export type RecoveryFallbackTicket = {
  id: string;
  problemId: string | null;
};
