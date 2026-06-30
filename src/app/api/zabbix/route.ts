import { NextRequest, NextResponse } from "next/server";
import { HELPDESK_CACHE_PREFIXES } from "@/app/helpdesk/cache/redis-keys";
import { invalidateCacheByPrefixes } from "@/libs/redis-cache";
import { emitAlertsChanged, emitTicketsChanged } from "@/libs/socket-emitter";
import { upsertInternalHelpdeskTicket, upsertZabbixSnapshot } from "./_lib/db-sync";
import { buildCreateTicketPayload, syncOtrsTicket } from "./_lib/otrs-sync";
import {
  buildWebhookContext,
  isAllowedOtrsSeverity,
  parseIncomingWebhookPayload,
} from "./_lib/webhook";
import { prisma } from "@/libs/prisma";

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
    // if (!isAllowedOtrsSeverity(context.trigger.severity)) {
    //   return NextResponse.json({
    //     success: true,
    //     action: "skipped",
    //     reason: "OTRS sync skipped: only High/Critical/Disaster severities are allowed.",
    //     requestId,
    //   });
    // }

    /* ---------------------------------------------------------------------- */
    /* Step 6: Enforce Severity and "SendtoOTRS: True" Tag for OTRS sync       */
    /* ---------------------------------------------------------------------- */
    const isAllowedSeverity = isAllowedOtrsSeverity(context.trigger.severity);

    // 🌟 Type ဖိုင်အရ context ထဲတွင် tagsString အသင့်ပါဝင်နေပြီဖြစ်၍ တိုက်ရိုက်ခေါ်သုံးပါမည်
    const rawTags = context.tagsString || "";
    const tagsString = rawTags.toLowerCase();

    // JSC ဘက်မှ Key="SendtoOTRS", Value="True" ဟု ထည့်ထားသဖြင့် အောက်ပါပုံစံများဖြင့် စစ်ဆေးမည်
    const hasSendToOtrsTag =
      tagsString.includes("sendtootrs: true") ||
      tagsString.includes("sendtootrs:true") ||
      tagsString.includes('"tag":"sendtootrs","value":"true"') || // JSON Object ပုံစံဖြင့်လာပါက
      tagsString.includes('"sendtootrs":"true"');

    // Severity မကိုက်ညီလျှင် (သို့မဟုတ်) SendtoOTRS Tag မပါလျှင် OTRS သို့ မပို့ဘဲ ကျော်သွားပါမည် (Skip)
    if (!isAllowedSeverity || !hasSendToOtrsTag) {
      let skipReason = "OTRS sync skipped: ";
      if (!isAllowedSeverity) skipReason += "Severity is not High/Critical/Disaster. ";
      if (!hasSendToOtrsTag) skipReason += "Missing 'SendtoOTRS: True' tag.";

      return NextResponse.json({
        success: true,
        action: "skipped",
        reason: skipReason.trim(),
        requestId,
      });
    }

    /* ---------------------------------------------------------------------- */
    /* Step 7: Run OTRS sync through create-ticket bridge                      */
    /* ---------------------------------------------------------------------- */
    // const otrsResult = await syncOtrsTicket(context, req.nextUrl.origin);

    // if (otrsResult.error) {
    //   return NextResponse.json(
    //     {
    //       success: false,
    //       error: otrsResult.error,
    //       requestId,
    //     },
    //     { status: 502 },
    //   );
    // }

    // if (otrsResult.data?.action === "skipped") {
    //   return NextResponse.json({
    //     success: true,
    //     action: "skipped",
    //     reason: otrsResult.data.reason,
    //   });
    // }

    // return NextResponse.json({ success: true });


    /* ---------------------------------------------------------------------- */
    /* Step 7: Run OTRS sync directly, Queue ONLY if it fails                  */
    /* ---------------------------------------------------------------------- */

    // 🌟 ၁။ OTRS သို့ ချက်ချင်း တိုက်ရိုက် လှမ်းပို့ပါမည် (Main Goal)
    const otrsResult = await syncOtrsTicket(context);

    // 🌟 ၂။ OTRS သို့ပို့သည်ကို အောင်မြင်လျှင် (သို့) Skip လုပ်လျှင် ပုံမှန်အတိုင်း ပြန်ပို့မည်
    if (otrsResult.data?.action === "skipped" || (!otrsResult.error && otrsResult.data)) {
      return NextResponse.json({
        success: true,
        action: otrsResult.data?.action || "ok",

      });
    }

    // 🌟 ၃။ OTRS ဆာဗာ Down နေ၍ Error တက်သွားမှသာ Backup အနေဖြင့် Queue ထဲ ထည့်ပါမည်
    if (otrsResult.error && internalResult.ticketId) {
      console.error(`[OTRS Sync Failed] Queuing for background sync. Error: ${otrsResult.error}`);

      // Queue ထဲထည့်ရန် OTRS Data အထုပ်ကို တည်ဆောက်ပါမည်
      // (မှတ်ချက်: buildCreateTicketPayload ကို ./_lib/otrs-sync ဖိုင်မှ export လုပ်ပေးရန်လိုပါမည်)
      const payload = buildCreateTicketPayload(context);

      await prisma.otrsSyncQueue.create({
        data: {
          ticketId: internalResult.ticketId, // 🌟 Step 4 မှ အသင့်ရလာသော EWM Ticket ID
          operation: internalResult.action === "created" ? "TicketCreate" : "TicketUpdate",
          payload: JSON.parse(JSON.stringify(payload)),
          status: "PENDING",
          retryCount: 0,
          referenceType: "ZABBIX",
          referenceId: context.event.id // Zabbix Event ID
        }
      });

      // Queue ထဲအောင်မြင်စွာ ထည့်ပြီးကြောင်း Zabbix ဆီသို့ ချက်ချင်း ပြန်ပို့ပေးပါမည်
      return NextResponse.json({
        success: true,
        action: "queued_due_to_error",
        error: otrsResult.error
      });
    }

    // အခြားသော မမျှော်လင့်ထားသည့် အခြေအနေများအတွက်
    return NextResponse.json(
      { success: false, error: "Failed to sync or queue", requestId },
      { status: 502 }
    );
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
