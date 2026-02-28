"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";

import TableBody from "@/components/TableBody";
import TableHead from "@/components/TableHead";
import { Ticket } from "@/generated/prisma/client";
import { usePriorityColor } from "@/hooks/usePriorityColor";
import { useStatusColor } from "@/hooks/useStatusColor";
import TableFooter from "./TableFooter";
import TableTopBar from "./TableTopBar";
import { renderCell, RenderCellHelpers } from "./renderCell";
import {
  ticketsListQueryOptions,
  toTicketsListQueryInput,
} from "../queries/query-options";

export type TicketWithRelations = Ticket & {
  requester?: { name: string; email: string } | null;
  assignedTo?: { name: string; email: string } | null;
  department: { id: string; name: string } | null;
};

type DepartmentPreset =
  | "active"
  | "urgent"
  | "unassigned"
  | "resolved"
  | "new"
  | "open"
  | "closed";

const columns = [
  { key: "ticketId", label: "Ticket ID" },
  { key: "title", label: "Title" },
  { key: "description", label: "Description" },
  { key: "status", label: "Status" },
  { key: "department", label: "Department" },
  { key: "priority", label: "Priority" },
  { key: "createdAt", label: "Created At" },
  // { key: "responseDue", label: "Response Due" },
  { key: "resolutionDue", label: "Resolution Due" },
  { key: "requester", label: "Requester" },
  { key: "assignedTo", label: "Assigned To" },
  { key: "isSlaViolated", label: "SLA Violated" },
] as const;

const OWNERSHIP_OPTIONS = new Set([
  "My Tickets",
  "Assigned To Me",
  "Followed",
  "Unassigned",
]);

const STATUS_OPTIONS = new Set([
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
  "CANCELED",
]);

const PRIORITY_OPTIONS = new Set(["REQUEST", "MINOR", "MAJOR", "CRITICAL"]);

const parseEnumList = (rawValue: string | null, enumSet: Set<string>) =>
  (rawValue ?? "")
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter((item) => enumSet.has(item));

const normalizeOwnership = (rawValue: string | null) => {
  const value = rawValue?.trim().toLowerCase();
  if (!value) return null;
  if (value === "my tickets") return "My Tickets";
  if (value === "assigned to me") return "Assigned To Me";
  if (value === "followed") return "Followed";
  if (value === "unassigned") return "Unassigned";
  return null;
};

const PRESET_LABELS: Record<DepartmentPreset, string> = {
  active: "Active Queue",
  urgent: "Urgent",
  unassigned: "Unassigned",
  resolved: "Resolved",
  new: "New",
  open: "Open",
  closed: "Closed",
};

export default function Page() {
  const [visibleColumns, setVisibleColumns] = useState(
    Object.fromEntries(columns.map((column) => [column.key, true])),
  );
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>(
    {},
  );
  const [selectedSearchQueryFilters, setSelectedSearchQueryFilters] = useState<
    Record<string, string[]>
  >({});
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const getStatusColor = useStatusColor;
  const getPriorityColor = usePriorityColor;
  const router = useRouter();
  const searchParams = useSearchParams();

  const departmentPresetContext = useMemo(() => {
    if (searchParams.get("source") !== "department") return null;

    const presetValue = searchParams.get("preset");
    if (
      presetValue !== "active" &&
      presetValue !== "urgent" &&
      presetValue !== "unassigned" &&
      presetValue !== "resolved" &&
      presetValue !== "new" &&
      presetValue !== "open" &&
      presetValue !== "closed"
    ) {
      return null;
    }

    const departmentName = searchParams.get("departmentName")?.trim() || "Department";
    return {
      preset: presetValue,
      presetLabel: PRESET_LABELS[presetValue],
      departmentName,
    };
  }, [searchParams]);

  useEffect(() => {
    const newFilters: Record<string, string[]> = {};
    const statusParam = searchParams.get("status");
    const ownershipParam = searchParams.get("ownership");
    const priorityParam = searchParams.get("priority");
    const archivedParam = searchParams.get("archived");
    const legacyFilterParam = searchParams.get("filter");

    const statusValues = parseEnumList(statusParam, STATUS_OPTIONS);
    if (statusValues.length) {
      newFilters.Status = statusValues;
    }

    const normalizedOwnership = normalizeOwnership(ownershipParam);
    if (normalizedOwnership && OWNERSHIP_OPTIONS.has(normalizedOwnership)) {
      newFilters.Ownership = [normalizedOwnership];
    }

    const priorityValues = parseEnumList(priorityParam, PRIORITY_OPTIONS);
    if (priorityValues.length) {
      newFilters.Priority = priorityValues;
    }

    if (
      archivedParam &&
      (archivedParam === "Archived" || archivedParam === "UnArchived")
    ) {
      newFilters.Archived = [archivedParam];
    }

    const newSearchFilters: Record<string, string[]> = {};
    const departmentParam = searchParams.get("department");
    const departmentIdParam = searchParams.get("departmentId");

    if (departmentParam) {
      newSearchFilters.department = [departmentParam];
    }

    if (departmentIdParam) {
      newSearchFilters.departmentId = [departmentIdParam];
    }

    if (legacyFilterParam) {
      const normalizedLegacyOwnership = normalizeOwnership(legacyFilterParam);
      if (
        normalizedLegacyOwnership &&
        OWNERSHIP_OPTIONS.has(normalizedLegacyOwnership)
      ) {
        newFilters.Ownership = [normalizedLegacyOwnership];
      } else {
        newSearchFilters.departmentId = [legacyFilterParam];
      }
    }

    setSelectedFilters(newFilters);
    setSelectedSearchQueryFilters(newSearchFilters);
    setCurrentPage(1);
  }, [searchParams]);

  const queryInput = useMemo(
    () =>
      toTicketsListQueryInput({
        search: selectedSearchQueryFilters,
        filters: selectedFilters,
        page: currentPage,
        pageSize,
      }),
    [selectedFilters, selectedSearchQueryFilters, currentPage, pageSize],
  );

  const ticketsQuery = useQuery(ticketsListQueryOptions(queryInput));
  const tickets = useMemo(
    () => ((ticketsQuery.data?.tickets ?? []) as TicketWithRelations[]),
    [ticketsQuery.data?.tickets],
  );
  const totalTickets = ticketsQuery.data?.total ?? 0;
  const totalPages = Math.ceil(totalTickets / pageSize);
  const isLoading = ticketsQuery.isLoading;
  const errorMessage = ticketsQuery.error
    ? ticketsQuery.error instanceof Error
      ? ticketsQuery.error.message
      : "Failed to load tickets."
    : null;

  useEffect(() => {
    // Query parameter ပြောင်းပြီး dataset အသစ်ရောက်လာချိန်မှာ
    // မရှိတော့တဲ့ row id selection မကျန်အောင် clean လုပ်ထားပါတယ်။
    setSelectedTickets((previous) =>
      previous.filter((id) => tickets.some((ticket) => ticket.id === id)),
    );
  }, [tickets]);

  useEffect(() => {
    const safeTotalPages = Math.max(1, totalPages);
    if (currentPage > safeTotalPages) {
      setCurrentPage(safeTotalPages);
    }
  }, [totalPages, currentPage]);

  const toggleColumn = (key: string) => {
    setVisibleColumns((previous) => ({ ...previous, [key]: !previous[key] }));
  };

  const toggleSelectTicket = (id: string) => {
    setSelectedTickets((previous) =>
      previous.includes(id)
        ? previous.filter((ticketId) => ticketId !== id)
        : [...previous, id],
    );
  };

  const toggleSelectAll = () => {
    if (!tickets.length) return;

    if (selectedTickets.length === tickets.length) {
      setSelectedTickets([]);
      return;
    }

    setSelectedTickets(tickets.map((ticket) => ticket.id));
  };

  const handleExcelDownload = () => {
    const selectedData = tickets.filter((ticket) =>
      selectedTickets.includes(ticket.id),
    );

    if (!selectedData.length) return;

    const headers = [
      "Ticket ID",
      "Title",
      "Description",
      "Status",
      "Priority",
      "Department",
      "Requester",
      "Assigned To",
      "Created At",
      "SLA Violated",
    ];

    const rows = selectedData.map((ticket) => [
      ticket.ticketId,
      ticket.title,
      ticket.description,
      ticket.status,
      ticket.priority ?? "",
      ticket.department?.name ?? "",
      ticket.requester?.name ?? "",
      ticket.assignedTo?.name ?? "",
      new Date(ticket.createdAt).toLocaleString("en-US", {
        timeZone: "Asia/Yangon",
      }),
      ticket.isSlaViolated ? "Yes" : "No",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `tickets-${Date.now()}.csv`;
    anchor.click();

    URL.revokeObjectURL(url);
  };

  const helpers: RenderCellHelpers = { getStatusColor, getPriorityColor };

  const visibleColumnKeys = useMemo(
    () => columns.filter((column) => visibleColumns[column.key]),
    [visibleColumns],
  );

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-5 sm:px-6 sm:py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4">
        <TableTopBar
          title="Tickets"
          onNew={() => router.push("/helpdesk/tickets/new")}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterGroups={[
            {
              title: "Ownership",
              options: ["My Tickets", "Assigned To Me", "Followed", "Unassigned"],
            },
            {
              title: "Status",
              options: [
                "NEW",
                "OPEN",
                "IN_PROGRESS",
                "RESOLVED",
                "CLOSED",
                "CANCELED",
              ],
            },
            {
              title: "Priority",
              options: ["REQUEST", "MINOR", "MAJOR", "CRITICAL"],
            },
            { title: "Archived", options: ["Archived", "UnArchived"] },
            { title: "SLA", options: ["Violated", "Not Violated"] },
          ]}
          selectedFilters={selectedFilters}
          setSelectedFilters={setSelectedFilters}
          columns={[...columns]}
          selectedSearchQueryFilters={selectedSearchQueryFilters}
          setSelectedSearchQueryFilters={setSelectedSearchQueryFilters}
          visibleColumns={visibleColumns}
          toggleColumn={toggleColumn}
          onDownload={handleExcelDownload}
          downloadDisabled={selectedTickets.length === 0}
        />

        {departmentPresetContext && (
          <section className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-zinc-700">
                <span className="font-semibold">
                  {departmentPresetContext.presetLabel}
                </span>{" "}
                preset from{" "}
                <span className="font-semibold">
                  {departmentPresetContext.departmentName}
                </span>
              </p>
              <button
                type="button"
                onClick={() => router.replace("/helpdesk/tickets")}
                className="inline-flex h-8 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
              >
                Clear Preset
              </button>
            </div>
            {/* Department card ကနေဝင်လာတဲ့ filter context ကို top banner နဲ့ပြထားလို့
                user က ဘာ filter state နဲ့ရောက်နေတယ်ဆိုတာချက်ချင်းနားလည်နိုင်ပါတယ်။ */}
          </section>
        )}

        {ticketsQuery.isFetching && !isLoading && (
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500">
            Syncing ticket list...
          </div>
        )}

        <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white p-4">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[1200px] border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50">
                <tr>
                  <th className="w-12 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={
                        selectedTickets.length === tickets.length &&
                        tickets.length > 0
                      }
                      onChange={toggleSelectAll}
                      className="accent-zinc-900"
                    />
                  </th>
                  {visibleColumnKeys.map((column) => (
                    <TableHead key={column.key} data={column.label} />
                  ))}
                </tr>
              </thead>

              <tbody>
                {!isLoading && tickets.length === 0 && (
                  <tr>
                    <td
                      colSpan={visibleColumnKeys.length + 1}
                      className="px-4 py-8 text-center text-sm text-zinc-500"
                    >
                      No tickets found for current filters.
                    </td>
                  </tr>
                )}

                {tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="cursor-pointer border-b border-zinc-100 transition-colors hover:bg-zinc-50"
                    onClick={() => router.push(`/helpdesk/tickets/${ticket.id}`)}
                  >
                    <td
                      className="px-3 py-3"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleSelectTicket(ticket.id);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTickets.includes(ticket.id)}
                        className="accent-zinc-900"
                        onChange={() => undefined}
                      />
                    </td>

                    {visibleColumnKeys.map((column) => {
                      const cellContent = renderCell(ticket, column.key, helpers);

                      return React.isValidElement(cellContent) ? (
                        React.cloneElement(cellContent, {
                          key: `${ticket.id}-${column.key}`,
                        })
                      ) : (
                        <TableBody
                          key={`${ticket.id}-${column.key}`}
                          data={cellContent as string}
                        />
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {isLoading && (
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500">
            Loading tickets...
          </div>
        )}

        {!isLoading && errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <TableFooter
          pageSize={pageSize}
          setPageSize={setPageSize}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          totalPages={Math.max(1, totalPages)}
        />
      </div>
    </div>
  );
}
