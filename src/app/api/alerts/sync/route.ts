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
  // Group items by hostid
  return hostIds.reduce((acc, hostid) => {
    acc[hostid] = items.filter((i) => i.hostid === hostid);
    return acc;
  }, {} as Record<string, ZabbixItem[]>);
}

// ======================
// API Route
// ======================

export async function GET(req: NextRequest) {



  console.log("Sync API called"); // ✅ server-safe


  const reqApiKey = req.headers.get("x-api-key");
  if (!reqApiKey || reqApiKey !== process.env.API_SECRET_KEY) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  try {
    const problems = await fetchProblems();
    if (!problems.length) return NextResponse.json({ success: true, result: [] });

    // Parallel batch fetch triggers
    const triggerIds = problems.map((p) => p.objectid);
    const triggers = await fetchTriggers(triggerIds);
    const triggersMap = Object.fromEntries(triggers.map((t) => [t.triggerid, t]));

    // Collect host IDs for items
    const hostIds = triggers.flatMap((t) => t.hosts?.map((h) => h.hostid) ?? []);
    const itemsMap = await fetchItemsBatch(hostIds);

    // Upsert all problems in parallel
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

    await clearAlertsCache();

    console.log("Sync complete, returning response");

    return NextResponse.json({ success: true, result: problems });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message ?? "Unknown error" });
  }
}
