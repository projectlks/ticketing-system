// app/api/zabbix/webhook/route.ts
// import { NextResponse } from "next/server";

// export async function POST(req: Request) {
//   const payload = await req.json();
//   console.log("Received Zabbix alert:", payload);
//   return NextResponse.json({ ok: true });
// }


// // async function fetchProblems(): Promise<ZabbixProblem[]> {
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


// app/api/zabbix/webhook/route.ts
// app/api/zabbix/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";

// ======================
// Webhook Receiver
// ======================
// app/api/zabbix/webhook/route.ts
// import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {


  console.log("It is reach ")

  try {
    // 1️⃣ Security check
    // const secret = req.headers.get("x-zabbix-secret");
    // if (secret !== process.env.ZABBIX_SECRET) {
    //   return new NextResponse("Unauthorized", { status: 401 });
    // }

    // // 2️⃣ Parse payload
    // const payload = await req.json();

    // // 3️⃣ Validate payload
    // if (!payload.subject || !payload.message) {
    //   return new NextResponse("Invalid payload structure", { status: 400 });
    // }

    // 4️⃣ Log / process
    // console.log("📢 Zabbix alert received:", payload);


  console.log("hello ")

    // 👉 here you can save to PostgreSQL later

    // 5️⃣ Respond fast
    return NextResponse.json({
      success: true,
      receivedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("❌ Webhook error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
