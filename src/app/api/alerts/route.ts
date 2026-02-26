import { NextRequest, NextResponse } from "next/server";

import {
  HELPDESK_CACHE_TTL_SECONDS,
  helpdeskRedisKeys,
} from "@/app/helpdesk/cache/redis-keys";
import { prisma } from "@/libs/prisma";
import { getOrSetCache } from "@/libs/redis-cache";

const DEFAULT_ALERTS_PAGE = 1;
const DEFAULT_ALERTS_PAGE_SIZE = 10;
const MAX_ALERTS_PAGE_SIZE = 100;

const normalizePositiveInt = (
  rawValue: string | null,
  fallback: number,
): number => {
  if (!rawValue) return fallback;

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const resolvePagination = (req: NextRequest) => {
  const takeParam = req.nextUrl.searchParams.get("take");
  if (takeParam) {
    const take = Math.min(
      normalizePositiveInt(takeParam, DEFAULT_ALERTS_PAGE_SIZE),
      MAX_ALERTS_PAGE_SIZE,
    );

    return {
      page: DEFAULT_ALERTS_PAGE,
      pageSize: take,
    };
  }

  const page = normalizePositiveInt(
    req.nextUrl.searchParams.get("page"),
    DEFAULT_ALERTS_PAGE,
  );
  const pageSize = Math.min(
    normalizePositiveInt(
      req.nextUrl.searchParams.get("pageSize"),
      DEFAULT_ALERTS_PAGE_SIZE,
    ),
    MAX_ALERTS_PAGE_SIZE,
  );

  return {
    page,
    pageSize,
  };
};

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  const expectedApiKey =
    process.env.API_SECRET_KEY ?? process.env.NEXT_PUBLIC_API_SECRET_KEY;

  if (!expectedApiKey || !apiKey || apiKey !== expectedApiKey) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const { page, pageSize } = resolvePagination(req);
    const cacheKey = helpdeskRedisKeys.currentAlerts(page, pageSize);

    // page + pageSize ပါတဲ့ key နဲ့ cache ခွဲထားလို့ pagination ပြောင်းတိုင်း
    // cached dataset မှန်မှန်ရပြီး page overlap မဖြစ်အောင် ကာကွယ်နိုင်ပါတယ်။
    const paginatedAlerts = await getOrSetCache(
      cacheKey,
      HELPDESK_CACHE_TTL_SECONDS.currentAlerts,
      async () => {
        const where = {
          acknowledgedAt: null,
        };

        const total = await prisma.zabbixTicket.count({ where });
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const safePage = Math.min(page, totalPages);

        const alerts = await prisma.zabbixTicket.findMany({
          where,
          orderBy: {
            createdAt: "desc",
          },
          skip: (safePage - 1) * pageSize,
          take: pageSize,
        });

        return {
          total,
          page: safePage,
          alerts,
        };
      },
    );

    return NextResponse.json({
      success: true,
      total: paginatedAlerts.total,
      page: paginatedAlerts.page,
      pageSize,
      count: paginatedAlerts.alerts.length,
      data: paginatedAlerts.alerts,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
