import { prisma } from "@/libs/prisma";
import { DEFAULT_CUSTOMER_EMAIL } from "./constants";
import {
  buildMandatoryArticleSubject,
  ensureMandatoryArticleBody,
  mapSeverityToOtrsPriorityLabel,
} from "./webhook";
import { NormalizedWebhookContext, OtrsSyncResult } from "./types";
import { OTRSPayload, otrsService } from "@/libs/otrsService";


export function buildCreateTicketPayload(context: NormalizedWebhookContext) {
  const ticketState = context.isRecoveryEvent ? "recovery" : "new";
  const defaultSubject = buildMandatoryArticleSubject(context);
  const articleSubject = context.alertSubject ?? defaultSubject;
  const articleBody = ensureMandatoryArticleBody(context.alertMessage, context);

  return {
    UserLogin: process.env.OTRS_USER_LOGIN || "myanmarapi",
    Password: process.env.OTRS_PASSWORD || "cQtw3qjF9Rt$_@",
    Ticket: {
      Title: context.trigger.name ?? "Monitoring Problem",
      QueueID: "96", // အစ်ကိုတို့ သုံးမည့် Queue ID
      Service: "CEIR",
      State: ticketState,
      Priority: mapSeverityToOtrsPriorityLabel(context.trigger.severity),
      Type: "Incident",
      CustomerUser: DEFAULT_CUSTOMER_EMAIL,
      ResponsibleID: "1"
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
    Article: {
      Subject: articleSubject,
      Body: articleBody,
      SenderType: "customer",
      From: DEFAULT_CUSTOMER_EMAIL,
      ContentType: "text/plain; charset=utf8",
      MimeType: "text/plain",
      Charset: "utf8",
      TimeUnit: 0,
    },
  };
}

/**
 * Persist returned OTRS ticket id into both zabbixTicket and main Ticket.
 */
async function persistOtrsTicketId(context: NormalizedWebhookContext, otrsTicketId: string) {
  // ၁။ Zabbix ဇယားကို Update လုပ်မည်
  await prisma.zabbixTicket.updateMany({
    where: {
      OR: [{ eventid: context.event.id }, { eventid: context.problemEventId }],
    },
    data: { otrsTicketId },
  });

  // ၂။ ပင်မ Ticket ဇယားကိုပါ Update လုပ်မည်
  await prisma.ticket.updateMany({
    where: { problemId: context.problemId },
    data: { otrsTicketId },
  });
}

/**
 * Orchestrate OTRS sync side-effect for one normalized webhook event.
 */
export async function syncOtrsTicket(
  context: NormalizedWebhookContext
): Promise<{ data?: OtrsSyncResult; error?: string }> {
  try {
    const basePayload = buildCreateTicketPayload(context);

    // 🌟 API Bridge ကို ဖျက်လိုက်ပြီဖြစ်၍ ဤနေရာတွင် OTRS Auth ကို တိုက်ရိုက်ထည့်ပေးရပါမည်
    const fullPayload: OTRSPayload = {
      ...basePayload,
      // Operation: "TicketCreate" စသည်ဖြင့် ထည့်လိုပါက ထည့်နိုင်ပါသည်
    } as OTRSPayload;

    // ၁။ OTRS သို့ Create လုပ်ရမည်လား၊ Update လုပ်ရမည်လား သိရန် ကိုယ့် Database တွင် အရင်ရှာပါမည် (TicketSearch အစား)
    const existingTicket = await prisma.ticket.findUnique({
      where: { problemId: context.problemId },
      select: { otrsTicketId: true, id: true },
    });

    if (existingTicket?.otrsTicketId) {
      // ----------------------------------------------------
      // [UPDATE FLOW] OTRS ID ရှိပြီးသားဖြစ်၍ တိုက်ရိုက် Update လုပ်မည်
      // ----------------------------------------------------
      const otrsRes = await otrsService.updateTicket(existingTicket.otrsTicketId, fullPayload);

      if (otrsRes.status >= 200 && otrsRes.status < 300) {
        return { data: { action: "ok" } };
      } else {
        return { error: `OTRS Update API Error: Status ${otrsRes.status}` };
      }

    } else {
      // ----------------------------------------------------
      // [CREATE FLOW] OTRS ID မရှိသေး၍ အသစ်ဖွင့်မည်
      // ----------------------------------------------------
      // [CREATE FLOW]
      if (context.isRecoveryEvent && existingTicket &&  existingTicket?.id) {
        // 🌟 ပြင်ဆင်ချက်: Recovery ဝင်လာပေမယ့် Create က Queue ထဲမှာ ရှိနေသေးရင် Skip မလုပ်ပါနဲ့
        const pendingCreate = await prisma.otrsSyncQueue.findFirst({
          where: {
            ticketId: existingTicket.id, // သို့မဟုတ် context.ticketId
            operation: "TicketCreate",
            status: "PENDING",
            referenceType: "ZABBIX",
          }
        });

        if (pendingCreate) {
          // Queue ထဲမှာ အလုပ်ကျန်နေသေးရင် Error ပြန်ပေးပြီး Cron ကို စောင့်ခိုင်းလိုက်ပါ
          return { error: "Waiting for TicketCreate to complete in queue." };
        }

        return { data: { action: "skipped", reason: "Recovery event received but no OTRS Ticket exists." } };
      }

      const otrsRes = await otrsService.createTicket(fullPayload);

      // 🌟 OTRS ဆီမှ အောင်မြင်ကြောင်း Status 200 ပြန်လာပြီး TicketID ပါလာမှသာ မှတ်သားပါမည်
      if (otrsRes.status >= 200 && otrsRes.status < 300 && otrsRes.data?.TicketID) {
        const otrsTicketId = String(otrsRes.data.TicketID);

        // အောင်မြင်ပါက ဇယား (၂) ခုလုံးတွင် ID သွားမှတ်မည်
        await persistOtrsTicketId(context, otrsTicketId);

        return { data: { action: "ok" } };
      } else {
        return { error: `OTRS Create API Error: Status ${otrsRes.status}` };
      }
    }
  } catch (error) {
    // ဤနေရာမှ Error ပြန်ထွက်သွားပါက route.ts က အလိုအလျောက် Queue ထဲသို့ ထည့်ပေးသွားပါမည်
    return { error: error instanceof Error ? error.message : String(error) };
  }
}