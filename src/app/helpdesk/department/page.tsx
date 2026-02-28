"use client";

import { MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";

import DepartmentCard from "@/components/DepartmentCard";

import { departmentsQueryOptions } from "../queries/query-options";

export type DepartmentTicketStats = {
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

export default function DepartmentPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const departmentsQuery = useQuery(departmentsQueryOptions());

  const departments = useMemo(
    () => ((departmentsQuery.data ?? []) as DepartmentTicketStats[]),
    [departmentsQuery.data],
  );

  // Local search filter ကို query cache data ပေါ်မှာတန်း run ထားလို့
  // typing လုပ်ချိန်တိုင်း server refetch မလုပ်ဘဲ UI response မြန်စေပါတယ်။
  const filteredDepartments = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return departments;

    return departments.filter((department) =>
      department.name.toLowerCase().includes(keyword),
    );
  }, [departments, searchQuery]);

  const isLoading = departmentsQuery.isLoading;
  const isRefreshing = departmentsQuery.isFetching && !departmentsQuery.isLoading;
  const errorMessage = departmentsQuery.error
    ? departmentsQuery.error instanceof Error
      ? departmentsQuery.error.message
      : "Failed to load departments."
    : null;

  const lastUpdatedAt = departmentsQuery.dataUpdatedAt
    ? new Date(departmentsQuery.dataUpdatedAt).toLocaleString()
    : "";

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-5 sm:px-6 sm:py-6">
      <div className="mx-auto w-full max-w-[1480px]">
        <header className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">
                Helpdesk
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
                Departments
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                Team workload and queue ownership by department
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">
              <label className="relative block w-full sm:min-w-[290px]">
                <MagnifyingGlassIcon
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search departments"
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
                />
              </label>

              <Link
                href="/helpdesk/department/new"
                className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-700">
                <PlusIcon className="h-4 w-4" aria-hidden="true" />
                New Department
              </Link>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
            <p>
              Showing {filteredDepartments.length} of {departments.length} departments
            </p>
            <p>
              {isLoading
                ? "Loading..."
                : lastUpdatedAt
                ? `Updated ${lastUpdatedAt}`
                : "Live data"}
            </p>
          </div>
        </header>

        {isRefreshing && (
          <div className="mt-4 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs text-zinc-500">
            Syncing latest department data...
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {isLoading && (
          <div className="mt-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500">
            Loading departments...
          </div>
        )}

        {!isLoading && !errorMessage && filteredDepartments.length === 0 && (
          <div className="mt-4 rounded-xl border border-zinc-200 bg-white px-4 py-6 text-center text-sm text-zinc-500">
            No departments matched your search.
          </div>
        )}

        {!isLoading && !errorMessage && filteredDepartments.length > 0 && (
          <section className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredDepartments.map((department) => (
              <DepartmentCard dept={department} key={department.id} />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
