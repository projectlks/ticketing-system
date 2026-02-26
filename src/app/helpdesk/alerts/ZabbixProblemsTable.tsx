"use client";

import React, { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";

import TableHead from "@/components/TableHead";
import { useFetchZabbix } from "@/hooks/useFetchZabbix";

import TableFooter from "../tickets/TableFooter";
import Body from "./Body";
import { ColumnPicker } from "./ColumnPicker";

type ColumnKey =
  | "eventid"
  | "name"
  | "severity"
  | "status"
  | "clock"
  | "tags"
  | "opdata"
  | "r_clock"
  | "hosts"
  | "source"
  | "object"
  | "objectid"
  | "suppressed"
  | "suppression_data";

type AlertFilter = "Zabbix" | "All Alerts";

const columns: { key: ColumnKey; label: string }[] = [
  { key: "eventid", label: "Problem ID" },
  { key: "name", label: "Name" },
  { key: "severity", label: "Severity" },
  { key: "status", label: "Status" },
  { key: "clock", label: "Start Time" },
  { key: "tags", label: "Tags" },
  { key: "opdata", label: "OpData" },
  { key: "r_clock", label: "Resolved Time" },
  { key: "hosts", label: "Hosts" },
  { key: "source", label: "Source" },
  { key: "object", label: "Object" },
  { key: "objectid", label: "Object ID" },
  { key: "suppressed", label: "Suppressed" },
  { key: "suppression_data", label: "Suppression Data" },
];

const defaultVisible: Record<ColumnKey, boolean> = Object.fromEntries(
  columns.map((column) => [column.key, true]),
) as Record<ColumnKey, boolean>;

const getFilterFromQuery = (value: string | null): AlertFilter =>
  value === "All Alerts" ? "All Alerts" : "Zabbix";

const formatUnixTimestamp = (timestamp: string) => {
  const numericValue = Number(timestamp);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return "-";
  }

  return new Date(numericValue * 1000).toLocaleString();
};

export default function ZabbixProblemsTable() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filter = getFilterFromQuery(searchParams.get("filter"));

  const [currentPage, setCurrentPageState] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [visibleColumns, setVisibleColumns] = useState(defaultVisible);

  const {
    data: problems = [],
    total,
    error,
    loading,
    isFetching,
  } = useFetchZabbix(filter, currentPage, pageSize);

  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  const displayCurrentPage = Math.min(currentPage, totalPages);

  const visibleColumnKeys = useMemo(
    () => columns.filter((column) => visibleColumns[column.key]),
    [visibleColumns],
  );

  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns((previous) => ({ ...previous, [key]: !previous[key] }));
  };

  const applyFilter = (nextFilter: AlertFilter) => {
    // Source filter ပြောင်းတဲ့ action က user intent သေချာတဲ့ event မို့ page reset ကို
    // event handler ထဲမှာတိုက်ရိုက်လုပ်ပြီး react-hooks effect warning ကိုရှောင်ထားပါတယ်။
    setCurrentPageState(1);

    const nextParams = new URLSearchParams(searchParams.toString());

    if (nextFilter === "All Alerts") {
      nextParams.set("filter", "All Alerts");
    } else {
      nextParams.delete("filter");
    }

    const queryString = nextParams.toString();
    const targetHref = queryString
      ? (`/helpdesk/alerts?${queryString}` as Route)
      : ("/helpdesk/alerts" as Route);

    router.replace(targetHref);
  };

  const dataSourceDescription =
    filter === "All Alerts"
      ? "Showing alerts synchronized from backend storage."
      : "Showing live alerts fetched from Zabbix API.";

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-5 sm:px-6 sm:py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4">
        <section className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <h1 className="text-base font-semibold tracking-tight text-zinc-900">
                  Alerts
                </h1>
                <p className="text-xs text-zinc-500">
                  Monitor incident stream and historical sync in one table.
                </p>
              </div>

              <span className="inline-flex h-8 items-center rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 text-xs font-medium text-zinc-600">
                {total} records
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-1">
                {(["Zabbix", "All Alerts"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => applyFilter(item)}
                    className={`inline-flex h-8 items-center rounded-md px-3 text-sm transition-colors ${
                      filter === item
                        ? "border border-zinc-200 bg-white text-zinc-900 shadow-sm"
                        : "text-zinc-600 hover:text-zinc-900"
                    }`}>
                    {item === "Zabbix" ? "Current Alerts" : item}
                  </button>
                ))}
              </div>

              <ColumnPicker
                columns={columns}
                visibleColumns={visibleColumns}
                toggleColumn={toggleColumn}
              />
            </div>
          </div>

          {/* Filter state ကိုစာသားနဲ့ပြပေးထားလို့ user က data source ဘာဖြစ်နေတယ်ဆိုတာ
              toggle button အရောင်ပဲမကြည့်ဘဲ မြန်မြန်နားလည်နိုင်ပါတယ်။ */}
          <p className="mt-3 text-xs text-zinc-500">{dataSourceDescription}</p>
        </section>

        {isFetching && !loading && (
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500">
            Syncing alerts...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white p-4">
          <div className="w-full overflow-x-auto">
            {/* Header/column wrap မဖြစ်အောင် table min width ကိုမြှင့်ပြီး
                overflow-x နဲ့သာ scroll ထွက်စေတဲ့ pattern သုံးထားပါတယ်။ */}
            <table className="w-full min-w-[1480px] border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50">
                <tr>
                  {visibleColumnKeys.map((column) => (
                    <TableHead key={column.key} data={column.label} />
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading && (
                  <tr>
                    <td
                      colSpan={visibleColumnKeys.length}
                      className="px-4 py-8 text-center text-sm text-zinc-500">
                      Loading alerts...
                    </td>
                  </tr>
                )}

                {!loading && problems.length === 0 && (
                  <tr>
                    <td
                      colSpan={visibleColumnKeys.length}
                      className="px-4 py-8 text-center text-sm text-zinc-500">
                      No alerts found for this source.
                    </td>
                  </tr>
                )}

                {!loading && problems.length > 0 && (
                  <Body
                    problems={problems}
                    columns={columns}
                    visibleColumns={visibleColumns}
                    formatDate={formatUnixTimestamp}
                  />
                )}
              </tbody>
            </table>
          </div>
        </section>

        <TableFooter
          pageSize={pageSize}
          setPageSize={setPageSize}
          currentPage={displayCurrentPage}
          setCurrentPage={(nextPage) => {
            setCurrentPageState((previous) => {
              const basePage = Math.min(previous, totalPages);
              const resolvedPage =
                typeof nextPage === "function" ? nextPage(basePage) : nextPage;
              return Math.max(1, Math.min(resolvedPage, totalPages));
            });
          }}
          totalPages={totalPages}
        />
      </div>
    </div>
  );
}
