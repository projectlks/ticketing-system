import { NextRequest, NextResponse } from "next/server";
import { HELPDESK_CACHE_PREFIXES } from "@/app/helpdesk/cache/redis-keys";
import { invalidateCacheByPrefixes } from "@/libs/redis-cache";
import { emitAlertsChanged, emitTicketsChanged } from "@/libs/socket-emitter";
import { upsertInternalHelpdeskTicket, upsertZabbixSnapshot } from "./_lib/db-sync";
import { syncOtrsTicket } from "./_lib/otrs-sync";
import {
  buildWebhookContext,
  isAllowedOtrsSeverity,
  parseIncomingWebhookPayload,
} from "./_lib/webhook";

/**
 * Zabbix Webhook Route (thin orchestration layer)
 *
 * Design principle:
 * - Keep this file short and linear.
 * - Complex logic lives in dedicated modules under ./_lib.
 * - Route focuses on "what step comes next", not low-level implementation.
 *
 * Pipeline overview:
 * 1) Parse webhook body + normalize payload shape
 * 2) Build validated canonical context
 * 3) Sync Zabbix snapshot table + emit alert socket event
 * 4) Sync internal helpdesk ticket + emit ticket socket event
 * 5) Enforce article requirement + severity gate
 * 6) Sync with OTRS bridge endpoint
 */
export async function POST(req: NextRequest) {
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    /* ---------------------------------------------------------------------- */
    /* Step 1: Parse incoming request body to normalized payload               */
    /* ---------------------------------------------------------------------- */
    const parsedWebhook = await parseIncomingWebhookPayload(req);
    if (parsedWebhook.error || !parsedWebhook.payload) {
      return NextResponse.json(
        {
          success: false,
          error: parsedWebhook.error?.message ?? "Invalid webhook payload",
          requestId,
        },
        { status: parsedWebhook.error?.status ?? 400 },
      );
    }

    /* ---------------------------------------------------------------------- */
    /* Step 2: Validate payload and build canonical context                    */
    /* ---------------------------------------------------------------------- */
    const contextResult = buildWebhookContext(parsedWebhook.payload);
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

    /* ---------------------------------------------------------------------- */
    /* Step 3: Upsert Zabbix snapshot + invalidate alerts cache + socket emit  */
    /* ---------------------------------------------------------------------- */
    const alertsAction = await upsertZabbixSnapshot(context);

    await invalidateCacheByPrefixes([HELPDESK_CACHE_PREFIXES.alerts]);

    emitAlertsChanged({
      action: alertsAction,
      eventId: context.event.id,
      problemId: context.problemId,
      status: context.status,
      at: new Date().toISOString(),
    });

    /* ---------------------------------------------------------------------- */
    /* Step 4: Upsert internal ticket + emit ticket socket event               */
    /* ---------------------------------------------------------------------- */
    const internalResult = await upsertInternalHelpdeskTicket(context);

    if (internalResult.error) {
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

    /* ---------------------------------------------------------------------- */
    /* Step 5: Enforce mandatory article subject/body for OTRS integration     */
    /* ---------------------------------------------------------------------- */
    if (!context.alertSubject || !context.alertMessage) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required webhook article content. Ensure Zabbix sends both subject and full message body.",
          missing: {
            subject: !context.alertSubject,
            message: !context.alertMessage,
          },
          requestId,
        },
        { status: 400 },
      );
    }

    /* ---------------------------------------------------------------------- */
    /* Step 6: Skip OTRS sync if severity is not High/Critical/Disaster        */
    /* ---------------------------------------------------------------------- */
    if (!isAllowedOtrsSeverity(context.trigger.severity)) {
      return NextResponse.json({
        success: true,
        action: "skipped",
        reason: "OTRS sync skipped: only High/Critical/Disaster severities are allowed.",
        requestId,
      });
    }

    /* ---------------------------------------------------------------------- */
    /* Step 7: Run OTRS sync through create-ticket bridge                      */
    /* ---------------------------------------------------------------------- */
    const otrsResult = await syncOtrsTicket(context, req.nextUrl.origin);

    if (otrsResult.error) {
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
  } catch {
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
