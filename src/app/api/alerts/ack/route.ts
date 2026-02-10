// import { prisma } from "@/libs/prisma";
// import { NextRequest, NextResponse } from "next/server";

// // POST /api/tickets/ack
// export async function POST(req: NextRequest) {
//     const { eventids, user } = await req.json();

//     if (!Array.isArray(eventids) || eventids.length === 0) {
//         return NextResponse.json(
//             { success: false, message: "eventids must be a non-empty array" },
//             { status: 400 }
//         );
//     }

//     const result = await prisma.zabbixTicket.updateMany({
//         where: {
//             eventid: { in: eventids },
//             acknowledgedAt: null, // 🔥 already ACK ဖြစ်ပြီးသား မထိ
//         },
//         data: {
//             acknowledgedAt: new Date(),
//             acknowledgedBy: user ?? "system",
//         },
//     });

//     return NextResponse.json({
//         success: true,
//         acknowledgedCount: result.count,
//     });
// }


import { clearAlertsCache } from "@/libs/alertsCacheClear";
import { prisma } from "@/libs/prisma";
import { NextRequest, NextResponse } from "next/server";

// POST /api/tickets/ack
export async function POST(req: NextRequest) {
    try {
        const { eventids, user } = await req.json();

        if (!Array.isArray(eventids) || eventids.length === 0) {
            return NextResponse.json(
                { success: false, message: "eventids must be a non-empty array" },
                { status: 400 }
            );
        }

        const result = await prisma.zabbixTicket.updateMany({
            where: {
                eventid: { in: eventids },
                acknowledgedAt: null,
            },
            data: {
                acknowledgedAt: new Date(),
                acknowledgedBy: user ?? "system",
            },
        });

        // 🔥 Clear Redis cache
      await   clearAlertsCache()
        return NextResponse.json({
            success: true,
            acknowledgedCount: result.count,
        });
    } catch (err) {
        return NextResponse.json(
            { success: false, error: (err as Error).message },
            { status: 500 }
        );
    }
}
