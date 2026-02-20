// import { NextRequest, NextResponse } from "next/server";
// import dayjs from "dayjs";
// import fetch from "node-fetch";
// import { prisma } from "@/libs/prisma";


// // ======================
// // Zabbix Types
// // ======================
// type ZabbixResponse<T> = {
//   jsonrpc: string;
//   result: T;
//   error?: { code: number; message: string; data: string };
//   id: number;
// };

// type ZabbixProblem = {
//   eventid: string;
//   objectid: string;
//   name: string;
//   r_eventid: string;
//   clock: string;
//   tags?: { tag: string; value: string }[];
//   hosts?: { hostid: string; host: string }[];
// };

// type ZabbixTrigger = {
//   triggerid: string;
//   description: string;
//   expression: string;
//   priority: string;
//   status: string;
//   hosts?: { hostid: string; host: string; inventory?: { tag?: string } }[];
//   groups?: { name: string }[];
// };

// type ZabbixItem = {
//   itemid: string;
//   hostid: string;
//   name: string;
//   key_: string;
//   lastvalue: string;
//   description?: string;
// };



// // ======================
// // JSON-RPC Request Helper
// // ======================
// async function zabbixRequest<T>(
//   method: string,
//   params: Record<string, unknown>,
//   token: string,
//   url: string
// ): Promise<T> {
//   const res = await fetch(url, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({
//       jsonrpc: "2.0",
//       method,
//       params,
//       auth: token,
//       id: 1,
//     }),
//   });

//   const data = (await res.json()) as ZabbixResponse<T>;
//   if (data.error) throw new Error(`${data.error.message}: ${data.error.data}`);
//   return data.result;
// }

// // ======================
// // Fetch Problems
// // ======================
// async function fetchProblems(): Promise<ZabbixProblem[]> {
//   const url = process.env.ZABBIX_URL!;
//   const token = process.env.ZABBIX_API_TOKEN!;
//   return zabbixRequest<ZabbixProblem[]>(
//     "problem.get",
//     {
//       output: "extend",
//       selectTags: "extend",
//       recent: true,
//       sortfield: "eventid",
//       sortorder: "DESC",
//     },
//     token,
//     url
//   );
// }

// // ======================
// // Fetch Trigger
// // ======================
// async function fetchTrigger(triggerid: string): Promise<ZabbixTrigger> {
//   const url = process.env.ZABBIX_URL!;
//   const token = process.env.ZABBIX_API_TOKEN!;
//   const triggers = await zabbixRequest<ZabbixTrigger[]>(
//     "trigger.get",
//     {
//       output: "extend",
//       selectHosts: ["hostid", "host", "inventory"],
//       selectGroups: ["name"],
//       triggerids: [triggerid],
//     },
//     token,
//     url
//   );
//   if (!triggers.length) throw new Error(`Trigger not found: ${triggerid}`);
//   return triggers[0];
// }

// // ======================
// // Fetch Items
// // ======================
// async function fetchItems(hostid: string): Promise<ZabbixItem[]> {
//   const url = process.env.ZABBIX_URL!;
//   const token = process.env.ZABBIX_API_TOKEN!;
//   return zabbixRequest<ZabbixItem[]>(
//     "item.get",
//     {
//       output: ["itemid", "name", "key_", "lastvalue", "description"],
//       hostids: hostid,
//     },
//     token,
//     url
//   );
// }


// // ======================
// // API Route
// // ======================



// export async function GET(req: NextRequest) {
//   const apiKey = req.headers.get("x-api-key"); // client sends header x-api-key
//   // const session = await getServerSession(authOptions);

//   if (!apiKey || apiKey !== process.env.NEXT_PUBLIC_API_SECRET_KEY) {
//     return NextResponse.json(
//       { success: false, message: "Unauthorized" },
//       { status: 401 }
//     );
//   }

//   try {
//     // const from = req.nextUrl.searchParams.get("from");

//     // Zabbix ကနေ fetch
//     const problems = await fetchProblems();

//     for (const problem of problems) {
//       // Check database if eventid already exists
//       const existing = await prisma.zabbixTicket.findUnique({
//         where: { eventid: problem.eventid },
//       });
//       if (existing) continue; // Already sent, skip

//       // Generate email
//       // const { subject, body } = await generateEmail(problem);




//       // Get extra details
//       const trigger = await fetchTrigger(problem.objectid);
//       const host = trigger.hosts?.[0];
//       const hostInventoryTag = host?.inventory?.tag ?? "N/A";
//       const items = host ? await fetchItems(host.hostid) : [];

//       const last5Values = items
//         .slice(0, 5)
//         .map((item, idx) => `${idx + 1}: ${item.lastvalue} (${item.name})`)
//         .join("\n");

//       const tagsString = problem.tags
//         ?.map((t) => `${t.tag}:${t.value}`)
//         .join(", ") ?? "";





//       await prisma.zabbixTicket.upsert({
//         where: {
//           eventid: problem.eventid,
//         },
//         update: {
//           // optional: update fields if already exists
//         },
//         create: {
//           eventid: problem.eventid,
//           name: problem.name,
//           status: String(problem.r_eventid),
//           clock: dayjs.unix(Number(problem.clock)).toDate(),

//           triggerId: trigger.triggerid,
//           triggerName: trigger.description,
//           triggerDesc: trigger.description,
//           triggerStatus: trigger.status,
//           triggerSeverity: trigger.priority,

//           hostName: host?.host,
//           hostTag: hostInventoryTag,
//           hostGroup: trigger.groups?.map((g) => g.name).join(", ") ?? null,

//           itemId: items[0]?.itemid ?? null,
//           itemName: items[0]?.name ?? null,
//           itemDescription: items[0]?.description ?? null,
//           last5Values,
//           tags: tagsString,

//           emailSent: true,
//         },
//       });


//     }





//     return NextResponse.json({
//       success: true,
//       result: problems,     // <-- FRONTEND NEEDS THIS

//     });

//   } catch (err: unknown) {
//     return NextResponse.json({
//       success: false,
//       error: (err as Error).message ?? "Unknown error",
//     });
//   }
// }


import { NextRequest, NextResponse } from "next/server";
import dayjs from "dayjs";
import fetch from "node-fetch";
import { prisma } from "@/libs/prisma";
import { clearAlertsCache } from "@/libs/alertsCacheClear";

// ======================
// Zabbix Types
// ======================
type ZabbixResponse<T> = {
  jsonrpc: string;
  result: T;
  error?: { code: number; message: string; data: string };
  id: number;
};

type ZabbixProblem = {
  eventid: string;
  objectid: string;
  name: string;
  r_eventid: string;
  clock: string;
  tags?: { tag: string; value: string }[];
  hosts?: { hostid: string; host: string }[];
};

type ZabbixTrigger = {
  triggerid: string;
  description: string;
  expression: string;
  priority: string;
  status: string;
  hosts?: { hostid: string; host: string; inventory?: { tag?: string } }[];
  groups?: { name: string }[];
};

type ZabbixItem = {
  itemid: string;
  hostid: string;
  name: string;
  key_: string;
  lastvalue: string;
  description?: string;
};

// ======================
// JSON-RPC Request Helper
// ======================
async function zabbixRequest<T>(
  method: string,
  params: Record<string, unknown>,
  token: string,
  url: string
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method,
      params,
      auth: token,
      id: 1,
    }),
  });

  const data = (await res.json()) as ZabbixResponse<T>;
  if (data.error) throw new Error(`${data.error.message}: ${data.error.data}`);
  return data.result;
}

// ======================
// Fetch Problems
// ======================
async function fetchProblems(): Promise<ZabbixProblem[]> {
  const url = process.env.ZABBIX_URL!;
  const token = process.env.ZABBIX_API_TOKEN!;
  return zabbixRequest<ZabbixProblem[]>(
    "problem.get",
    {
      output: "extend",
      selectTags: "extend",
      recent: true,
      sortfield: "eventid",
      sortorder: "DESC",
    },
    token,
    url
  );
}

// ======================
// Batch Fetch Triggers
// ======================
async function fetchTriggers(triggerIds: string[]): Promise<ZabbixTrigger[]> {
  if (!triggerIds.length) return [];
  const url = process.env.ZABBIX_URL!;
  const token = process.env.ZABBIX_API_TOKEN!;
  return zabbixRequest<ZabbixTrigger[]>(
    "trigger.get",
    {
      output: "extend",
      selectHosts: ["hostid", "host", "inventory"],
      selectGroups: ["name"],
      triggerids: triggerIds,
    },
    token,
    url
  );
}

// ======================
// Batch Fetch Items
// ======================
async function fetchItemsBatch(hostIds: string[]): Promise<Record<string, ZabbixItem[]>> {
  if (!hostIds.length) return {};
  const url = process.env.ZABBIX_URL!;
  const token = process.env.ZABBIX_API_TOKEN!;
  const items = await zabbixRequest<ZabbixItem[]>(
    "item.get",
    {
      output: ["itemid", "name", "key_", "lastvalue", "description"],
      hostids: hostIds,
    },
    token,
    url
  );
  // host တစ်ခုချင်းစီအလိုက် item list ပြန်တည်ဆောက်ထားတာမို့ lookup လုပ်တဲ့အခါ O(1) နီးပါးမြန်မယ်
  return hostIds.reduce((acc, hostid) => {
    acc[hostid] = items.filter((i) => i.hostid === hostid);
    return acc;
  }, {} as Record<string, ZabbixItem[]>);
}


// ======================
// API Route
// ======================

export async function GET(req: NextRequest) {
  // ဒီ endpoint က cron/internal caller အတွက်ဖြစ်လို့ API key မမှန်ရင် တန်းပိတ်

  const reqApiKey = req.headers.get("x-api-key");
  if (!reqApiKey || reqApiKey !== process.env.API_SECRET_KEY) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  try {
    const problems = await fetchProblems();
    if (!problems.length) return NextResponse.json({ success: true, result: [] });

    // problem တစ်စုလုံးအတွက် trigger data ကို batch တစ်ခါတည်းဆွဲပြီး N+1 call မဖြစ်အောင်လုပ်
    const triggerIds = problems.map((p) => p.objectid);
    const triggers = await fetchTriggers(triggerIds);
    const triggersMap = Object.fromEntries(triggers.map((t) => [t.triggerid, t]));

    // trigger တွေက host id တွေစုပြီး item data ကိုလည်း batch fetch
    const hostIds = triggers.flatMap((t) => t.hosts?.map((h) => h.hostid) ?? []);
    const itemsMap = await fetchItemsBatch(hostIds);

    // eventid ကို unique key အဖြစ်သုံးပြီး alert တိုင်းကို upsert (parallel) လုပ်
    const upsertPromises = problems.map(async (problem) => {
      const trigger = triggersMap[problem.objectid];
      if (!trigger) return null;

      const host = trigger.hosts?.[0];
      const hostInventoryTag = host?.inventory?.tag ?? "N/A";
      const items = host ? itemsMap[host.hostid] ?? [] : [];

      const last5Values = items
        .slice(0, 5)
        .map((item, idx) => `${idx + 1}: ${item.lastvalue} (${item.name})`)
        .join("\n");

      const tagsString = problem.tags?.map((t) => `${t.tag}:${t.value}`).join(",") ?? "";


      return prisma.zabbixTicket.upsert({
        where: { eventid: problem.eventid },
        update: {},
        create: {
          eventid: problem.eventid,
          name: problem.name,
          status: String(problem.r_eventid),
          clock: dayjs.unix(Number(problem.clock)).toDate(),

          triggerId: trigger.triggerid,
          triggerName: trigger.description,
          triggerDesc: trigger.description,
          triggerStatus: trigger.status,
          triggerSeverity: trigger.priority,

          hostName: host?.host,
          hostTag: hostInventoryTag,
          hostGroup: trigger.groups?.map((g) => g.name).join(",") ?? null,

          itemId: items[0]?.itemid ?? null,
          itemName: items[0]?.name ?? null,
          itemDescription: items[0]?.description ?? null,
          last5Values,
          tags: tagsString,

        },
      });
    });

    await Promise.all(upsertPromises);

    // alerts list page က stale data မပြအောင် cache ကို sync ပြီးတိုင်းရှင်း
    await clearAlertsCache();

    console.log("Sync complete, returning response");

    return NextResponse.json({ success: true, result: problems });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message ?? "Unknown error" });
  }
}



// for webhook route, we need to be more flexible in parsing the incoming payload since different Zabbix versions and configurations may send different fields/structures. The goal is to extract the necessary information (eventid, trigger details, host details, tags) in a robust way without being too strict on the input format. This way we can support a wider range of Zabbix setups without requiring users to customize their webhook payloads heavily.









type WebhookPayload = Record<string, unknown>;

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function pickString(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

function parseTags(value: unknown): { tag: string; value: string }[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        const tagRecord = toRecord(entry);
        if (!tagRecord) return null;
        const tag = pickString(tagRecord, ["tag"]);
        const tagValue = pickString(tagRecord, ["value"]);
        if (!tag || !tagValue) return null;
        return { tag, value: tagValue };
      })
      .filter((tag): tag is { tag: string; value: string } => Boolean(tag));
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((pair) => pair.trim())
      .filter(Boolean)
      .map((pair) => {
        const [tag, ...rest] = pair.split(":");
        const tagValue = rest.join(":").trim();
        return {
          tag: tag?.trim() ?? "",
          value: tagValue,
        };
      })
      .filter((entry) => entry.tag && entry.value);
  }

  const obj = toRecord(value);
  if (!obj) return [];

  return Object.entries(obj)
    .map(([tag, tagValue]) => {
      if (tagValue === undefined || tagValue === null) return null;
      return { tag, value: String(tagValue) };
    })
    .filter((entry): entry is { tag: string; value: string } => Boolean(entry));
}

function parseClock(value?: string): Date {
  if (!value) return new Date();
  if (/^\d+$/.test(value)) {
    const num = Number(value);
    if (!Number.isFinite(num)) return new Date();
    if (num > 1_000_000_000_000) return new Date(num);
    return dayjs.unix(num).toDate();
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date();
  return date;
}

function normalizeStatus(value?: string): string {
  if (!value) return "0";

  const normalized = value.trim().toLowerCase();
  if (["problem", "triggered", "active", "firing"].includes(normalized)) return "0";
  if (["ok", "resolved", "recovery", "recovered"].includes(normalized)) return "1";
  return value;
}

async function parseWebhookPayload(req: NextRequest): Promise<WebhookPayload> {
  const raw = (await req.text()).trim();
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as unknown;
    const obj = toRecord(parsed);
    if (!obj) return {};

    const dataObj = toRecord(obj.data);
    if (!dataObj) return obj;

    // Keep both top-level and nested data fields; top-level takes priority.
    return { ...dataObj, ...obj };
  } catch {
    if (!raw.includes("=")) {
      return { message: raw };
    }

    const params = new URLSearchParams(raw);
    const formPayload: WebhookPayload = {};
    for (const [key, value] of params.entries()) {
      formPayload[key] = value;
    }
    return formPayload;
  }
}

function readWebhookKey(req: NextRequest): string | null {
  const headerKey = req.headers.get("x-api-key");
  if (headerKey) return headerKey;

  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();

  return req.nextUrl.searchParams.get("key");
}



export async function POST(req: NextRequest) {
  try {
    const expectedKey = process.env.ZABBIX_WEBHOOK_SECRET ?? process.env.API_SECRET_KEY;
    if (!expectedKey) {
      return NextResponse.json(
        { success: false, message: "Server is missing webhook secret configuration" },
        { status: 500 }
      );
    }

    const requestKey = readWebhookKey(req);
    if (!requestKey || requestKey !== expectedKey) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const payload = await parseWebhookPayload(req);
    const eventObj = toRecord(payload.event);
    const triggerObj = toRecord(payload.trigger);
    const hostObj = toRecord(payload.host);

    const eventid =
      pickString(payload, ["eventid", "event_id", "eventId", "EVENT.ID"]) ??
      (eventObj ? pickString(eventObj, ["eventid", "id"]) : undefined);

    if (!eventid) {
      return NextResponse.json(
        { success: false, message: "Missing required field: eventid" },
        { status: 400 }
      );
    }

    const objectid =
      pickString(payload, ["objectid", "triggerid", "trigger_id", "triggerId", "TRIGGER.ID"]) ??
      (triggerObj ? pickString(triggerObj, ["id", "triggerid"]) : undefined);

    let trigger: ZabbixTrigger | undefined;
    if (objectid) {
      const [triggerDetails] = await fetchTriggers([objectid]);
      trigger = triggerDetails;
    }

    const hostFromTrigger = trigger?.hosts?.[0];
    const hostId =
      hostFromTrigger?.hostid ??
      pickString(payload, ["hostid", "host_id"]) ??
      (hostObj ? pickString(hostObj, ["id", "hostid"]) : undefined);

    const itemsMap = hostId ? await fetchItemsBatch([hostId]) : {};
    const items = hostId ? itemsMap[hostId] ?? [] : [];

    const payloadTags = parseTags(payload.tags);
    const eventTags = eventObj ? parseTags(eventObj.tags) : [];
    const fallbackTags = parseTags(payload.event_tags);
    const tags = payloadTags.length ? payloadTags : eventTags.length ? eventTags : fallbackTags;
    const tagsString = tags.map((tag) => `${tag.tag}:${tag.value}`).join(",");

    const hostName =
      hostFromTrigger?.host ??
      pickString(payload, ["host", "host_name", "hostname"]) ??
      (hostObj ? pickString(hostObj, ["host", "name"]) : undefined);

    const hostTag =
      hostFromTrigger?.inventory?.tag ??
      pickString(payload, ["host_tag", "tag"]) ??
      (hostObj ? pickString(hostObj, ["tag"]) : undefined) ??
      "N/A";

    const hostGroup =
      trigger?.groups?.map((group) => group.name).join(",") ??
      pickString(payload, ["host_group", "group", "group_name"]) ??
      null;

    const triggerName =
      trigger?.description ??
      pickString(payload, ["trigger_name", "name", "problem", "subject"]);

    const ticketName = triggerName ?? `Zabbix event ${eventid}`;

    const triggerStatus =
      trigger?.status ?? pickString(payload, ["trigger_status", "status", "event_status"]);

    const triggerSeverity =
      trigger?.priority ?? pickString(payload, ["severity", "priority", "trigger_severity"]);

    const last5Values = items
      .slice(0, 5)
      .map((item, idx) => `${idx + 1}: ${item.lastvalue} (${item.name})`)
      .join("\n");

    const normalizedStatus = normalizeStatus(
      pickString(payload, ["r_eventid", "status", "event_status", "value"]) ??
      (eventObj ? pickString(eventObj, ["r_eventid", "status", "value"]) : undefined)
    );

    const clock = parseClock(
      pickString(payload, ["clock", "timestamp", "event_time", "time"]) ??
      (eventObj ? pickString(eventObj, ["clock", "timestamp", "time"]) : undefined)
    );

    const upsertData = {
      eventid,
      name: ticketName,
      status: normalizedStatus,
      clock,

      triggerId: trigger?.triggerid ?? objectid ?? null,
      triggerName: ticketName,
      triggerDesc:
        trigger?.description ?? pickString(payload, ["description", "trigger_description"]) ?? null,
      triggerStatus: triggerStatus ?? null,
      triggerSeverity: triggerSeverity ?? null,

      hostName: hostName ?? null,
      hostTag: hostTag ?? null,
      hostGroup,

      itemId: items[0]?.itemid ?? null,
      itemName: items[0]?.name ?? null,
      itemDescription: items[0]?.description ?? null,
      last5Values: last5Values || null,
      tags: tagsString || null,
    };

    await prisma.zabbixTicket.upsert({
      where: { eventid },
      update: upsertData,
      create: upsertData,
    });

    await clearAlertsCache();

    return NextResponse.json({
      success: true,
      message: "Zabbix webhook processed",
      eventid,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: (err as Error).message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
