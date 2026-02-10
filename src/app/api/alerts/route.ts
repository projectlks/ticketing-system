// import { prisma } from "@/libs/prisma";
// import { NextRequest, NextResponse } from "next/server";

// // GET /api/tickets
// export async function GET(req: NextRequest) {
//   const apiKey = req.headers.get("x-api-key");




//   if (!apiKey || apiKey !== process.env.NEXT_PUBLIC_API_SECRET_KEY) {
//     return NextResponse.json(
//       { success: false, message: "Unauthorized" },
//       { status: 401 }
//     );
//   }

//   try {
//     const tickets = await prisma.zabbixTicket.findMany({
//       where: {
//         acknowledgedAt: null, // 🔥 confirm မလုပ်ရသေးတာပဲ
//         status: "0"
//       },
//       orderBy: {
//         clock: "desc",
//       },
//     });

//     return NextResponse.json({
//       success: true,
//       count: tickets.length,
//       data: tickets,
//     });
//   } catch (err: unknown) {
//     return NextResponse.json(
//       {
//         success: false,
//         error: (err as Error).message ?? "Unknown error",
//       },
//       { status: 500 }
//     );
//   }
// }


// import { prisma } from "@/libs/prisma";
// import redis from "@/libs/redis";
// // import { redis } from "@/libs/redis";
// import { NextRequest, NextResponse } from "next/server";

// export async function GET(req: NextRequest) {
//   const apiKey = req.headers.get("x-api-key");

//   if (!apiKey || apiKey !== process.env.API_SECRET_KEY) {
//     return NextResponse.json(
//       { success: false, message: "Unauthorized" },
//       { status: 401 }
//     );
//   }

//   const CACHE_KEY = "tickets:unacknowledged";

//   try {
//     // 1️⃣ Redis cache check
//     const cached = await redis.get(CACHE_KEY);

//     if (cached) {

//       console.log("Cache hit");

//       const alerts = JSON.parse(cached);
//       return NextResponse.json({
//         success: true,
//         count: alerts.length,
//         data: alerts,
//       });
//     }


//     console.log("Cache miss");
//     // 2️⃣ Prisma DB query
//     const alerts = await prisma.zabbixTicket.findMany({
//       where: {
//         acknowledgedAt: null,
//         status: "0",
//       },
//       orderBy: {
//         createdAt: "desc",
//       },
//     });

//     // 3️⃣ Cache result (60 seconds)
//     await redis.set(CACHE_KEY, JSON.stringify(alerts), "EX", 600);

//     return NextResponse.json({
//       success: true,
//       count: alerts.length,
//       data: alerts,
//     });
//   } catch (err: unknown) {
//     return NextResponse.json(
//       {
//         success: false,
//         error: (err as Error).message ?? "Unknown error",
//       },
//       { status: 500 }
//     );
//   }
// }

import { prisma } from "@/libs/prisma";
import redis from "@/libs/redis";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");

  if (!apiKey || apiKey !== process.env.API_SECRET_KEY) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // 1️⃣ Get take param from query string
    const url = new URL(req.url);
    const takeParam = url.searchParams.get("take");
    const take = takeParam ? parseInt(takeParam) : undefined;

    // 2️⃣ Redis cache key depends on take
    const CACHE_KEY = `tickets:unacknowledged:${take ?? "all"}`;

    // 3️⃣ Redis cache check
    const cached = await redis.get(CACHE_KEY);
    if (cached) {
      console.log("Cache hit");

      const alerts = JSON.parse(cached);
      return NextResponse.json({
        success: true,
        count: alerts.length,
        data: alerts,
      });
    }

    console.log("Cache miss");

    // 4️⃣ Prisma DB query with optional take
    const alerts = await prisma.zabbixTicket.findMany({
      where: {
        acknowledgedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
      take, // limit number of records if provided
    });

    // 5️⃣ Cache result (600 seconds)
    await redis.set(CACHE_KEY, JSON.stringify(alerts), "EX", 600);

    return NextResponse.json({
      success: true,
      count: alerts.length,
      data: alerts,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: (err as Error).message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}
