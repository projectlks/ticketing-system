import {
  formatMyanmarDateTime,
  formatMyanmarTime,
  MYANMAR_DISPLAY_LOCALE,
  MYANMAR_TIME_ZONE,
} from "@/libs/myanmar-date-time";

type TicketOutboundEvent = "created" | "updated";

type TicketOutboundSyncParams = {
  event: TicketOutboundEvent;
  ticketId: string;
  ticket: unknown;
};

type TicketOutboundSyncResult = {
  ok: boolean;
  skipped: boolean;
  status?: number;
  error?: string;
};

type TicketOutboundPayload = {
  source: "ticket_v2";
  event: TicketOutboundEvent;
  sentAt: string;
  ticketId: string;
  ticket: unknown;
  localization: {
    locale: string;
    timeZone: string;
    sentAtMyanmar: string;
    sentTimeMyanmar: string;
    ticketDateTimes: Record<string, string>;
  };
};

const DEFAULT_TIMEOUT_MS = 10_000;

const DATE_FIELD_KEYS = [
  "createdAt",
  "updatedAt",
  "responseDue",
  "resolutionDue",
  "startSlaTime",
  "changedAt",
  "viewedAt",
  "resolvedAt",
] as const;

const toNumberOrDefault = (raw: string | undefined, fallback: number) => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const toValidDate = (value: unknown): Date | null => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
};

const buildTicketDateTimes = (ticket: unknown): Record<string, string> => {
  const ticketRecord = toRecord(ticket);
  if (!ticketRecord) return {};

  const formatted: Record<string, string> = {};

  for (const key of DATE_FIELD_KEYS) {
    const date = toValidDate(ticketRecord[key]);
    if (!date) continue;

    const text = formatMyanmarDateTime(date);
    if (!text) continue;

    formatted[key] = text;
  }

  return formatted;
};

const buildPayload = (
  params: TicketOutboundSyncParams,
  sentAt: Date,
): TicketOutboundPayload => ({
  source: "ticket_v2",
  event: params.event,
  sentAt: sentAt.toISOString(),
  ticketId: params.ticketId,
  ticket: params.ticket,
  localization: {
    locale: MYANMAR_DISPLAY_LOCALE,
    timeZone: MYANMAR_TIME_ZONE,
    sentAtMyanmar: formatMyanmarDateTime(sentAt),
    sentTimeMyanmar: formatMyanmarTime(sentAt),
    ticketDateTimes: buildTicketDateTimes(params.ticket),
  },
});

export async function syncTicketOutbound(
  params: TicketOutboundSyncParams,
): Promise<TicketOutboundSyncResult> {
  const endpoint = process.env.TICKET_OUTBOUND_API_URL?.trim();




  if (!endpoint) {
    return { ok: true, skipped: true };
  }
  
  const timeoutMs = toNumberOrDefault(
    process.env.TICKET_OUTBOUND_TIMEOUT_MS,
    DEFAULT_TIMEOUT_MS,
  );
  const token = process.env.TICKET_OUTBOUND_API_TOKEN?.trim();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const sentAt = new Date();
    const payload = buildPayload(params, sentAt);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const responseText = await response.text();
      return {
        ok: false,
        skipped: false,
        status: response.status,
        error: responseText.slice(0, 400),
      };
    }

    return {
      ok: true,
      skipped: false,
      status: response.status,
    };
  } catch (error) {
    return {
      ok: false,
      skipped: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}
