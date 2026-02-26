"use client";

import { useQuery } from "@tanstack/react-query";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useMemo, useState } from "react";

import DepartmentCard from "@/components/DepartmentCard";
import { overviewQueryOptions } from "./queries/query-options";

type PriorityKey = "REQUEST" | "MINOR" | "MAJOR" | "CRITICAL";
type OwnershipFilter = "Assigned To Me" | "My Tickets";

type DepartmentTicketStats = {
  id: string;
  name: string;
  contact: string | null;
  email: string | null;
  count: {
    new: number;
    open: number;
    closed: number;
    urgent: number;
    unassigned: number;
  };
};

type OverviewTicketStats = {
  request: number;
  minor: number;
  major: number;
  critical: number;
  assignedTotal: number;
  openedRequest: number;
  openedMinor: number;
  openedMajor: number;
  openedCritical: number;
  openedTotal: number;
  closedCount: number;
  slaSuccess: number;
  slaFail: number;
};

type TicketRow = {
  label: string;
  helper: string;
  ownership: OwnershipFilter;
  values: Record<PriorityKey, number>;
  total: number;
};

const PRIORITY_COLUMNS: PriorityKey[] = [
  "REQUEST",
  "MINOR",
  "MAJOR",
  "CRITICAL",
];

const EMPTY_TICKET_STATS: OverviewTicketStats = {
  request: 0,
  minor: 0,
  major: 0,
  critical: 0,
  assignedTotal: 0,
  openedRequest: 0,
  openedMinor: 0,
  openedMajor: 0,
  openedCritical: 0,
  openedTotal: 0,
  closedCount: 0,
  slaSuccess: 0,
  slaFail: 0,
};

const buildTicketHref = (
  ownership: OwnershipFilter,
  priority?: PriorityKey,
) => ({
  pathname: "/helpdesk/tickets",
  query: {
    ownership,
    status: "OPEN,IN_PROGRESS,NEW",
    ...(priority ? { priority } : {}),
  },
});

export default function Page() {
  const [searchQuery, setSearchQuery] = useState("");
  const overviewQuery = useQuery(overviewQueryOptions());

  const departments: DepartmentTicketStats[] = useMemo(
    () =>
      (overviewQuery.data?.departments as
        | DepartmentTicketStats[]
        | undefined) ?? [],
    [overviewQuery.data?.departments],
  );
  const ticketStats: OverviewTicketStats = useMemo(
    () =>
      (overviewQuery.data?.ticketStats as OverviewTicketStats | undefined) ??
      EMPTY_TICKET_STATS,
    [overviewQuery.data?.ticketStats],
  );

  const isLoading = overviewQuery.isLoading;
  const isRefreshing = overviewQuery.isFetching && !overviewQuery.isLoading;
  const errorMessage = overviewQuery.error
    ? overviewQuery.error instanceof Error
      ? overviewQuery.error.message
      : "Failed to load overview data. Please refresh."
    : null;
  const lastUpdatedAt = overviewQuery.dataUpdatedAt
    ? new Date(overviewQuery.dataUpdatedAt).toLocaleString()
    : "";

  const filteredDepartments = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return departments;

    return departments.filter((department) =>
      department.name.toLowerCase().includes(keyword),
    );
  }, [departments, searchQuery]);

  // Assigned/Opened row config ကို data-driven လုပ်ထားလို့ column logic ပြင်ချင်ရင်
  // UI markup မရှုပ်ဘဲ row data block မှာပဲ update လုပ်လို့ရပါတယ်။
  const ticketRows: TicketRow[] = [
    {
      label: "Assigned To Me",
      helper: "Tickets currently assigned to your account",
      ownership: "Assigned To Me",
      values: {
        REQUEST: ticketStats.request,
        MINOR: ticketStats.minor,
        MAJOR: ticketStats.major,
        CRITICAL: ticketStats.critical,
      },
      total: ticketStats.assignedTotal,
    },
    {
      label: "Opened By Me",
      helper: "Tickets created by your account",
      ownership: "My Tickets",
      values: {
        REQUEST: ticketStats.openedRequest,
        MINOR: ticketStats.openedMinor,
        MAJOR: ticketStats.openedMajor,
        CRITICAL: ticketStats.openedCritical,
      },
      total: ticketStats.openedTotal,
    },
  ];

  const slaTotal = ticketStats.slaSuccess + ticketStats.slaFail;
  const slaSuccessRate =
    slaTotal > 0 ? Math.round((ticketStats.slaSuccess / slaTotal) * 100) : 0;

  const kpiCards: Array<{ label: string; value: string; helper: string }> = [
    {
      label: "Assigned Active",
      value: String(ticketStats.assignedTotal),
      helper: "Owned by you",
    },
    {
      label: "Opened Active",
      value: String(ticketStats.openedTotal),
      helper: "Created by you",
    },
    {
      label: "Closed Today",
      value: String(ticketStats.closedCount),
      helper: "Resolved today",
    },
    {
      label: "SLA Success",
      value: `${slaSuccessRate}%`,
      helper: `${ticketStats.slaSuccess}/${slaTotal} today`,
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
              Helpdesk
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Overview Dashboard
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Calm, focused summary of your current queue.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[340px]">
            <label className="relative block">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search departments"
                className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
            <p className="text-xs text-zinc-500">
              {isLoading
                ? "Refreshing..."
                : lastUpdatedAt
                  ? `Updated ${lastUpdatedAt}`
                  : "Live data"}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        {isRefreshing && (
          <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-500">
            Syncing latest dashboard data...
          </div>
        )}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpiCards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">
                {card.label}
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {card.value}
              </p>
              <p className="mt-1 text-xs text-zinc-500">{card.helper}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <article className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
            <h2 className="text-base font-semibold tracking-tight">
              My Tickets
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Active statuses only: NEW, OPEN, IN_PROGRESS
            </p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[680px] border-separate border-spacing-0">
                <thead>
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                    <th className=" border-b border-zinc-200 px-3 py-2">
                      Ownership
                    </th>
                    {PRIORITY_COLUMNS.map((priority) => (
                      <th
                        key={`head-${priority}`}
                        className=" border-b border-zinc-200  px-3 py-2 text-center">
                        {priority}
                      </th>
                    ))}
                    <th className="border-b border-zinc-200  px-3 py-2 text-center">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ticketRows.map((row) => (
                    <tr key={row.label}>
                      <td className="border-b border-zinc-200 px-3 py-3 align-top">
                        <p className="text-sm font-semibold text-zinc-900">
                          {row.label}
                        </p>
                        <p className="text-xs text-zinc-500">{row.helper}</p>
                      </td>

                      {PRIORITY_COLUMNS.map((priority) => (
                        <td
                          key={`${row.label}-${priority}`}
                          className="border-b border-zinc-200 px-2 py-3">
                          <Link
                            href={buildTicketHref(row.ownership, priority)}
                            className="block rounded-md py-1 text-center text-base font-semibold tracking-tight transition-colors hover:bg-zinc-100">
                            {row.values[priority]}
                          </Link>
                        </td>
                      ))}

                      <td className="border-b border-zinc-200 px-2 py-3">
                        <Link
                          href={buildTicketHref(row.ownership)}
                          className="block rounded-md py-1 text-center text-base font-semibold tracking-tight transition-colors hover:bg-zinc-100">
                          {row.total}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <aside className="space-y-4">
            <article className="rounded-xl border border-zinc-200 bg-white p-4">
              <h3 className="text-sm font-semibold tracking-tight text-zinc-900">
                Today Performance
              </h3>
              <div className="mt-3 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Closed</span>
                  <span className="font-semibold">
                    {ticketStats.closedCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">SLA Success</span>
                  <span className="font-semibold">
                    {ticketStats.slaSuccess}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">SLA Fail</span>
                  <span className="font-semibold">{ticketStats.slaFail}</span>
                </div>
              </div>
            </article>

            <article className="rounded-xl border border-zinc-200 bg-white p-4">
              <h3 className="text-sm font-semibold tracking-tight text-zinc-900">
                Quick Access
              </h3>
              <div className="mt-3 space-y-2">
                <Link
                  href={buildTicketHref("Assigned To Me")}
                  className="block rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-50">
                  Open Assigned Queue
                </Link>
                <Link
                  href={buildTicketHref("My Tickets")}
                  className="block rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-50">
                  Open Created Queue
                </Link>
              </div>
            </article>
          </aside>
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-base font-semibold tracking-tight">
              Departments
            </h2>
            <p className="text-xs text-zinc-500">
              {filteredDepartments.length} result
              {filteredDepartments.length === 1 ? "" : "s"}
            </p>
          </div>

          {isLoading && (
            <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500">
              Loading overview data...
            </div>
          )}

          {!isLoading && errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {!isLoading && !errorMessage && filteredDepartments.length === 0 && (
            <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500">
              No departments matched your search.
            </div>
          )}

          {!isLoading && !errorMessage && filteredDepartments.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {filteredDepartments.map((department) => (
                <DepartmentCard key={department.id} dept={department} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
