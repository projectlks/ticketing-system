"use server";

import { prisma } from "@/libs/prisma";
import { getOrSetCache } from "@/libs/redis-cache";

import {
  HELPDESK_CACHE_TTL_SECONDS,
  helpdeskRedisKeys,
} from "../cache/redis-keys";

type AlertsPaginationInput = {
  page?: number;
  pageSize?: number;
};

const DEFAULT_ALERTS_PAGE = 1;
const DEFAULT_ALERTS_PAGE_SIZE = 10;
const MAX_ALERTS_PAGE_SIZE = 100;

const normalizePositiveInt = (value: number | undefined, fallback: number) => {
  if (!Number.isFinite(value) || !value || value <= 0) {
    return fallback;
  }

  return Math.floor(value);
};

const normalizePaginationInput = (input: AlertsPaginationInput = {}) => {
  const page = normalizePositiveInt(input.page, DEFAULT_ALERTS_PAGE);
  const requestedPageSize = normalizePositiveInt(
    input.pageSize,
    DEFAULT_ALERTS_PAGE_SIZE,
  );
  const pageSize = Math.min(requestedPageSize, MAX_ALERTS_PAGE_SIZE);

  return { page, pageSize };
};

export async function getPaginatedZabbixTickets(input: AlertsPaginationInput = {}) {
  const { page, pageSize } = normalizePaginationInput(input);
  const cacheKey = helpdeskRedisKeys.zabbixTicketsPage(page, pageSize);

  try {
    // page + pageSize ကို cache key ထဲထည့်ထားလို့ pagination ပြောင်းတိုင်း
    // cache collision မဖြစ်ဘဲ row set မှန်မှန်ပြန်ရနိုင်ပါတယ်။
    const paginatedData = await getOrSetCache(
      cacheKey,
      HELPDESK_CACHE_TTL_SECONDS.zabbixTickets,
      async () => {
        const total = await prisma.zabbixTicket.count();
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const safePage = Math.min(page, totalPages);

        const tickets = await prisma.zabbixTicket.findMany({
          orderBy: {
            eventid: "desc",
          },
          skip: (safePage - 1) * pageSize,
          take: pageSize,
        });

        return {
          total,
          page: safePage,
          tickets,
        };
      },
    );

    return {
      success: true,
      data: paginatedData.tickets,
      total: paginatedData.total,
      page: paginatedData.page,
      pageSize,
    };
  } catch (error) {
    console.error("getPaginatedZabbixTickets error:", error);

    return {
      success: false,
      error: "Failed to fetch paginated Zabbix tickets",
      data: [],
      total: 0,
      page,
      pageSize,
    };
  }
}

export async function getAllZabbixTickets() {
  const cacheKey = helpdeskRedisKeys.zabbixTickets();

  try {
    const tickets = await getOrSetCache(
      cacheKey,
      HELPDESK_CACHE_TTL_SECONDS.zabbixTickets,
      async () =>
        prisma.zabbixTicket.findMany({
          orderBy: {
            eventid: "desc",
          },
        }),
    );

    return {
      success: true,
      data: tickets,
    };
  } catch (error) {
    console.error("getAllZabbixTickets error:", error);

    return {
      success: false,
      error: "Failed to fetch Zabbix tickets",
    };
  }
}
