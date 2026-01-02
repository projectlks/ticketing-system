

import { checkEventStatus } from "@/libs/action";
import { prisma } from "@/libs/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const data = await req.json();

    const eventid =
      data.text?.match(/Original event ID:\s*(\d+)/)?.[1] ?? null;

    if (!eventid) {
      return NextResponse.json({ success: false, message: "No event ID found" }, { status: 400 });
    }

    // console.log("EventID is :", eventid);

    const res = await checkEventStatus(eventid);
    // console.log("Zabbix check result:", res);

    // Zabbix မှာ ရှိ/မရှိမရွေး status update
    const statusToUpdate = res.exists ? res.status ?? "1" : "1"; // ရှိရင် status, မရှိရင် "1"

    await prisma.zabbixTicket.update({
      where: { eventid },
      data: {
        status: statusToUpdate,
        clock: new Date(),
      },
    });

    console.log("✅ Zabbix ticket status updated to", statusToUpdate);

    return NextResponse.json({ success: true, status: statusToUpdate });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("❌ POST /api/new-mail error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

