"use client";

import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { alertsProblemsQueryOptions } from "@/app/helpdesk/queries/query-options";

export const useFetchZabbix = (
  filter: string,
  page: number,
  pageSize: number,
) => {
  const apiKey = process.env.NEXT_PUBLIC_API_SECRET_KEY;
  const queryClient = useQueryClient();

  const queryInput = useMemo(
    () => ({
      filter,
      page,
      pageSize,
    }),
    [filter, page, pageSize],
  );

  const query = useQuery(alertsProblemsQueryOptions(queryInput, apiKey));

  const total = query.data?.total ?? 0;
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));

  useEffect(() => {
    if (page >= totalPages) return;

    const nextPageInput = {
      filter,
      page: page + 1,
      pageSize,
    };

    // လက်ရှိ page ဖွင့်ထားချိန် next page ကို background မှာ warm-up လုပ်ထားလို့
    // pagination next click တဲ့အချိန် latency ကိုလျှော့နိုင်ပါတယ်။
    void queryClient.prefetchQuery(alertsProblemsQueryOptions(nextPageInput, apiKey));
  }, [apiKey, filter, page, pageSize, queryClient, totalPages]);

  return {
    data: query.data?.alerts ?? [],
    total,
    page: query.data?.page ?? page,
    pageSize: query.data?.pageSize ?? pageSize,
    loading: query.isLoading,
    error: query.error
      ? query.error instanceof Error
        ? query.error.message
        : "Unknown error"
      : null,
    isFetching: query.isFetching,
  };
};
