import { prisma } from "@/libs/prisma";
import { DEFAULT_CUSTOMER_EMAIL, LOCAL_CREATE_TICKET_URL } from "./constants";
import {
  buildMandatoryArticleSubject,
  ensureMandatoryArticleBody,
  mapSeverityToOtrsPriorityLabel,
  normalizeTicketId,
} from "./webhook";
import {
  CreateTicketCallResult,
  CreateTicketResponse,
  NormalizedWebhookContext,
  OtrsSyncResult,
} from "./types";

/**
 * =====================================================================================
 * OTRS Sync Module
 * =====================================================================================
 *
 * Responsibility boundary for this module:
 * 1) Build outbound /api/create-ticket payload from normalized webhook context
 * 2) Call create-ticket endpoint with primary + fallback URL strategy
 * 3) Parse create-ticket response and normalize errors
 * 4) Persist returned OTRS TicketID to zabbixTicket row
 *
 * This keeps route.ts focused on orchestration only.
 */

/**
 * Build payload for internal create-ticket bridge endpoint.
 *
 * Note:
 * - Article Subject/Body are enforced by webhook helpers to keep ticket content complete.
 * - State = "new" for problem and "recovery" for resolved events.
 */
function buildCreateTicketPayload(context: NormalizedWebhookContext) {
  const ticketState = context.isRecoveryEvent ? "recovery" : "new";
  const defaultSubject = buildMandatoryArticleSubject(context);
  const articleSubject = context.alertSubject ?? defaultSubject;
  const articleBody = ensureMandatoryArticleBody(context.alertMessage, context);

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
    Article: {
      Subject: articleSubject,
      Body: articleBody,
    },
    Message: articleBody,
  };
}

/**
 * Execute single create-ticket HTTP request and parse JSON response.
 */
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

/**
 * Primary URL tries current request origin (/api/create-ticket).
 * If request origin is missing/invalid, fallback to localhost URL.
 */
function resolvePrimaryCreateTicketUrl(requestOrigin?: string): string {
  if (!requestOrigin) return LOCAL_CREATE_TICKET_URL;

  try {
    const resolved = new URL("/api/create-ticket", requestOrigin);
    return resolved.toString();
  } catch {
    return LOCAL_CREATE_TICKET_URL;
  }
}

/**
 * Retry strategy:
 * 1) Call create-ticket on same origin as incoming webhook
 * 2) If failed and primary wasn't localhost, retry localhost fallback
 */
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

/**
 * Persist returned OTRS ticket id into zabbixTicket.
 *
 * Recovery event may refer to problem event row, so we try both keys.
 */
async function persistOtrsTicketId(context: NormalizedWebhookContext, otrsTicketId: string) {
  await prisma.zabbixTicket.updateMany({
    where: {
      OR: [{ eventid: context.event.id }, { eventid: context.problemEventId }],
    },
    data: { otrsTicketId },
  });
}

/**
 * Orchestrate OTRS sync side-effect for one normalized webhook event.
 */
export async function syncOtrsTicket(
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
    const errorCode = ticketData.otrsError?.code ?? ticketData.data?.Error?.ErrorCode;
    return {
      error: errorCode
        ? `${createTicketErrorMessage} (${errorCode})`
        : createTicketErrorMessage,
    };
  }

  const otrsTicketId =
    normalizeTicketId(ticketData.data?.TicketID) ?? normalizeTicketId(ticketData.ticketId);

  if (otrsTicketId) {
    await persistOtrsTicketId(context, otrsTicketId);
  }

  return { data: { action: "ok" } };
}
