// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/libs/prisma";

// // POST /api/tickets/status
// export async function POST(req: NextRequest) {
//     try {
//         const { eventids, status, user } = await req.json();

//         if (!Array.isArray(eventids) || eventids.length === 0) {
//             return NextResponse.json(
//                 { success: false, message: "eventids must be a non-empty array" },
//                 { status: 400 }
//             );
//         }

//         if (typeof status !== "string") {
//             return NextResponse.json(
//                 { success: false, message: "status must be a string" },
//                 { status: 400 }
//             );
//         }

//         const result = await prisma.zabbixTicket.updateMany({
//             where: {
//                 eventid: { in: eventids },
//             },
//             data: {
//                 status,
//                 // Optional: who changed it
//                 acknowledgedBy: user ?? "system",
//             },
//         });

//         return NextResponse.json({
//             success: true,
//             updatedCount: result.count,
//             status,
//         });
//     } catch (err) {
//         return NextResponse.json(
//             { success: false, error: (err as Error).message },
//             { status: 500 }
//         );
//     }
// }


import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/libs/prisma";
import { clearAlertsCache } from "@/libs/alertsCacheClear";


// POST /api/tickets/status
export async function POST(req: NextRequest) {
    try {
        const { eventids, status, user } = await req.json();

        if (!Array.isArray(eventids) || eventids.length === 0) {
            return NextResponse.json(
                { success: false, message: "eventids must be a non-empty array" },
                { status: 400 }
            );
        }

        if (typeof status !== "string") {
            return NextResponse.json(
                { success: false, message: "status must be a string" },
                { status: 400 }
            );
        }

        const result = await prisma.zabbixTicket.updateMany({
            where: {
                eventid: { in: eventids },
            },
            data: {
                status,
                acknowledgedBy: user ?? "system",
            },
        });

        // 🔥 Clear related Redis cache
        await clearAlertsCache()

        return NextResponse.json({
            success: true,
            updatedCount: result.count,
            status,
        });
    } catch (err) {
        return NextResponse.json(
            { success: false, error: (err as Error).message },
            { status: 500 }
        );
    }
}
