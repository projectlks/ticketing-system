import { NextRequest, NextResponse } from "next/server";
import dayjs from "dayjs";
import fetch from "node-fetch";
import nodemailer from "nodemailer";
import { prisma } from "@/libs/prisma";

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
// Nodemailer setup
// ======================



const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,       // e.g., mail.ird.gov.mm
  port: Number(process.env.SMTP_PORT), // 25
  secure: false,                     // false for port 25
  auth: {
    user: process.env.SMTP_USER,     // e.g., ewm@ird.gov.mm
    pass: process.env.SMTP_PASSWORD, // your password
  },
  tls: {
    rejectUnauthorized: false,       // Important if server has self-signed cert
  },
});


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
// Fetch Trigger
// ======================
async function fetchTrigger(triggerid: string): Promise<ZabbixTrigger> {
  const url = process.env.ZABBIX_URL!;
  const token = process.env.ZABBIX_API_TOKEN!;
  const triggers = await zabbixRequest<ZabbixTrigger[]>(
    "trigger.get",
    {
      output: "extend",
      selectHosts: ["hostid", "host", "inventory"],
      selectGroups: ["name"],
      triggerids: [triggerid],
    },
    token,
    url
  );
  if (!triggers.length) throw new Error(`Trigger not found: ${triggerid}`);
  return triggers[0];
}

// ======================
// Fetch Items
// ======================
async function fetchItems(hostid: string): Promise<ZabbixItem[]> {
  const url = process.env.ZABBIX_URL!;
  const token = process.env.ZABBIX_API_TOKEN!;
  return zabbixRequest<ZabbixItem[]>(
    "item.get",
    {
      output: ["itemid", "name", "key_", "lastvalue", "description"],
      hostids: hostid,
    },
    token,
    url
  );
}

// ======================
// Generate Email
// ======================
async function generateEmail(problem: ZabbixProblem): Promise<{ subject: string; body: string }> {
  const trigger = await fetchTrigger(problem.objectid);
  const host = trigger.hosts?.[0];
  const hostInventoryTag = host?.inventory?.tag ?? "N/A";
  const items = host ? await fetchItems(host.hostid) : [];
  const eventTime = dayjs.unix(Number(problem.clock));

  const last5Values = items
    .slice(0, 5)
    .map((item, idx) => `${idx + 1}: ${item.lastvalue} (${item.name})`)
    .join("\n");

  const subject = `${hostInventoryTag} - ${problem.r_eventid}: ${problem.name} on ${host?.host}`;
  const body = `
Problem started at ${eventTime.format("HH:mm:ss")} on ${eventTime.format("YYYY-MM-DD")}
Trigger client: ${hostInventoryTag}
Trigger groups: ${trigger.groups?.map((g) => g.name).join(", ") ?? "N/A"}
Hostname: ${host?.host}
Trigger: ${problem.name}
Trigger description: ${trigger.description}
Trigger status: ${trigger.status}
Trigger severity: ${trigger.priority}
Trigger expression: ${trigger.expression}
Trigger ID: ${trigger.triggerid}
ItemName: ${items[0]?.name ?? "N/A"}
Item ID: ${items[0]?.itemid ?? "N/A"}
Item description: ${items[0]?.description ?? "N/A"}

CIName:  [${hostInventoryTag}] [${host?.host}] ${items[0]?.name ?? ""} ${problem.tags?.map((t) => `${t.tag}:${t.value}`).join(", ") ?? ""
    }

----
${problem.tags?.map((t) => `${t.tag}:${t.value}`).join(", ") ?? ""}

Original event ID: ${problem.eventid}
Event created: ${dayjs().format("YYYY-MM-DD HH:mm:ss")}
Action Name: N/A

Last 5 Item values:
${last5Values}

Item graph: "http://10.2.10.10/history.php?action=showgraph&itemids%5B%5D=${items[0]?.itemid}"
Item history: "http://10.2.10.10/history.php?action=showvalues&itemids%5B%5D=${items[0]?.itemid}"
Graph direct image: http://10.2.10.10/chart.php?itemids%5B%5D=${items[0]?.itemid}
Event Detail: "http://10.2.10.10/tr_events.php?triggerid=${trigger.triggerid}&eventid=${problem.eventid}"
`;
  return { subject, body };
}

// ======================
// Send Email
// ======================

async function sendEmail(to: string, subject: string, body: string) {
  console.log("📧 Sending mail...");

  try {
    const info = await transporter.sendMail({
      from: `"Zabbix Alerts" <${process.env.SMTP_USER}>`, // must match SMTP_USER
      to,
      subject,
      text: body,
    });

    console.log("✅ Mail sent successfully:", info.response);
  } catch (err) {
    console.error("❌ Mail send failed:", err);
  }
}

// ======================
// API Route
// ======================



export async function GET(req: NextRequest) {
  try {
    const from = req.nextUrl.searchParams.get("from");
    const problems = await fetchProblems(); // your Zabbix API fetch



      // console.log(problems.map(p => p.eventid))

    for (const problem of problems) {
      // Check database if eventid already exists
      const existing = await prisma.zabbixTicket.findUnique({
        where: { eventid: problem.eventid },
      });
      if (existing) continue; // Already sent, skip

      // Generate email
      const { subject, body } = await generateEmail(problem);


      if (from === "cron") {
        console.log("🟢 CRON fetch — can send email");
        await sendEmail("mglinkar08@gmail.com", subject, body);

        return NextResponse.json({ ok: true });
      }
      // await sendEmail("mglinkar08@gmail.com", subject, body);



      // Get extra details
      const trigger = await fetchTrigger(problem.objectid);
      const host = trigger.hosts?.[0];
      const hostInventoryTag = host?.inventory?.tag ?? "N/A";
      const items = host ? await fetchItems(host.hostid) : [];

      const last5Values = items
        .slice(0, 5)
        .map((item, idx) => `${idx + 1}: ${item.lastvalue} (${item.name})`)
        .join("\n");

      const tagsString = problem.tags
        ?.map((t) => `${t.tag}:${t.value}`)
        .join(", ") ?? "";



      await prisma.zabbixTicket.create({
        data: {
          eventid: problem.eventid,
          name: problem.name,
          status: String(problem.r_eventid),
          clock: dayjs.unix(Number(problem.clock)).toDate(),

          // NEW FIELDS
          triggerId: trigger.triggerid,
          triggerName: trigger.description,
          triggerDesc: trigger.description,
          triggerStatus: trigger.status,
          triggerSeverity: trigger.priority,

          hostName: host?.host,
          hostTag: hostInventoryTag,
          hostGroup: trigger.groups?.map((g) => g.name).join(", ") ?? null,

          itemId: items[0]?.itemid ?? null,
          itemName: items[0]?.name ?? null,
          itemDescription: items[0]?.description ?? null,
          last5Values,
          tags: tagsString,

          emailSent: true,
        },
      });

    }





    return NextResponse.json({
      success: true,
      result: problems,     // <-- FRONTEND NEEDS THIS

    });

  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      error: (err as Error).message ?? "Unknown error",
    });
  }
}

