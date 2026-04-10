"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useSession } from "next-auth/react";

import TableBody from "@/components/TableBody";
import TableHead from "@/components/TableHead";
import { Ticket } from "@/generated/prisma/client";
import { usePriorityColor } from "@/hooks/usePriorityColor";
import { useStatusColor } from "@/hooks/useStatusColor";
import { useCreationModeColor } from "@/hooks/useCreationModeColor";
import { getSocket } from "@/libs/socket-client";
import ConfirmDialog from "@/components/ConfirmDialog";
import TableFooter from "./TableFooter";
import TableTopBar from "./TableTopBar";
import { renderCell, RenderCellHelpers } from "./renderCell";
import {
  helpdeskQueryKeys,
  ticketsListQueryOptions,
  toTicketsListQueryInput,
} from "../queries/query-options";
import { deleteTickets } from "./action";
import { formatMyanmarDateTime } from "@/libs/myanmar-date-time";

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

type TicketChangeType = "new" | "updated";
type TicketsChangedPayload = {
  action?: string;
  ticketId?: string;
  ids?: string[];
};

const columns = [
  { key: "ticketId", label: "Ticket ID" },
  { key: "title", label: "Title" },
  { key: "description", label: "Description" },
  { key: "status", label: "Status" },
  { key: "department", label: "Department" },
  { key: "priority", label: "Priority" },
  { key: "createdAt", label: "Created At" },
  { key: "creationMode", label: "Creation Mode" },
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

const TICKET_HIGHLIGHT_MS = 12_000;

export default function Page() {
  const [visibleColumns, setVisibleColumns] = useState(
    Object.fromEntries(columns.map((column) => [column.key, true])),
  );
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, string[]>
  >({});
  const [selectedSearchQueryFilters, setSelectedSearchQueryFilters] = useState<
    Record<string, string[]>
  >({});
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [recentChanges, setRecentChanges] = useState<
    Record<string, TicketChangeType>
  >({});
  const changeTimeoutsRef = useRef<Record<string, number>>({});

  const getStatusColor = useStatusColor;
  const getPriorityColor = usePriorityColor;
  const getCreationModeColor = useCreationModeColor;
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [isDeleting, setIsDeleting] = useState(false);
  const canDelete = session?.user.role === "SUPER_ADMIN";
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

    const departmentName =
      searchParams.get("departmentName")?.trim() || "Department";
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
    const slaParam = searchParams.get("sla");
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

    if (slaParam) {
      const normalized = slaParam.trim().toLowerCase();
      if (normalized === "violated") {
        newFilters.SLA = ["Violated"];
      } else if (normalized === "not violated") {
        newFilters.SLA = ["Not Violated"];
      }
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
    () => (ticketsQuery.data?.tickets ?? []) as TicketWithRelations[],
    [ticketsQuery.data?.tickets],
  );
  const totalTickets = ticketsQuery.data?.total ?? 0;
  const totalPages = Math.ceil(totalTickets / Math.max(1, pageSize));
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

  useEffect(() => {
    if (showDeleteConfirm && selectedTickets.length === 0) {
      setShowDeleteConfirm(false);
    }
  }, [showDeleteConfirm, selectedTickets.length]);

  const markTicketChange = useCallback(
    (ticketId: string, type: TicketChangeType) => {
      if (!ticketId) return;

      setRecentChanges((previous) => ({
        ...previous,
        [ticketId]: type,
      }));

      const existingTimeout = changeTimeoutsRef.current[ticketId];
      if (existingTimeout) {
        window.clearTimeout(existingTimeout);
      }

      changeTimeoutsRef.current[ticketId] = window.setTimeout(() => {
        setRecentChanges((previous) => {
          if (!previous[ticketId]) return previous;
          const next = { ...previous };
          delete next[ticketId];
          return next;
        });

        delete changeTimeoutsRef.current[ticketId];
      }, TICKET_HIGHLIGHT_MS);
    },
    [],
  );

  useEffect(() => {
    return () => {
      Object.values(changeTimeoutsRef.current).forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      changeTimeoutsRef.current = {};
    };
  }, []);

  useEffect(() => {
    const socket = getSocket();
    const handleTicketsChanged = (payload?: TicketsChangedPayload) => {
      if (payload?.action === "created" && payload.ticketId) {
        markTicketChange(payload.ticketId, "new");
      }

      if (payload?.action === "updated" && payload.ticketId) {
        markTicketChange(payload.ticketId, "updated");
      }

      if (payload?.action === "deleted" && Array.isArray(payload.ids)) {
        setRecentChanges((previous) => {
          if (!payload.ids?.length) return previous;
          const next = { ...previous };
          for (const id of payload.ids) {
            delete next[id];
            const timeoutId = changeTimeoutsRef.current[id];
            if (timeoutId) {
              window.clearTimeout(timeoutId);
              delete changeTimeoutsRef.current[id];
            }
          }
          return next;
        });
      }

      void queryClient.invalidateQueries({
        queryKey: helpdeskQueryKeys.tickets.all,
      });
    };

    socket.on("tickets-changed", handleTicketsChanged);
    return () => {
      socket.off("tickets-changed", handleTicketsChanged);
    };
  }, [markTicketChange, queryClient]);

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
      "Creation Mode",
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
      formatMyanmarDateTime(ticket.createdAt),
      ticket.creationMode ?? "",
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

  const helpers: RenderCellHelpers = {
    getStatusColor,
    getPriorityColor,
    getCreationModeColor,
  };

  const handleDeleteRequest = () => {
    if (!canDelete || selectedTickets.length === 0) return;
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!canDelete || selectedTickets.length === 0) return;

    try {
      setIsDeleting(true);
      const result = await deleteTickets(selectedTickets);
      if (result?.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Tickets archived.");
      setSelectedTickets([]);
      setShowDeleteConfirm(false);
      await queryClient.invalidateQueries({
        queryKey: helpdeskQueryKeys.tickets.all,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete tickets.";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const visibleColumnKeys = useMemo(
    () => columns.filter((column) => visibleColumns[column.key]),
    [visibleColumns],
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-5 sm:px-6 sm:py-6">
      <ToastContainer position="top-right" autoClose={2500} />
      <ConfirmDialog
        open={showDeleteConfirm}
        title={`Delete ${selectedTickets.length} ticket(s)?`}
        contextLabel="Danger Action"
        description="This will archive the selected tickets."
        confirmLabel={`Archive ${selectedTickets.length} Ticket(s)`}
        cancelLabel="Cancel"
        tone="danger"
        isLoading={isDeleting}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
      />
      <div className="mx-auto flex w-full max-w-400 flex-col gap-4">
        <TableTopBar
          title="Tickets"
          onNew={() => router.push("/helpdesk/tickets/new")}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterGroups={[
            {
              title: "Ownership",
              options: [
                "My Tickets",
                "Assigned To Me",
                "Followed",
                "Unassigned",
              ],
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
            { title: "Creation Mode", options: ["MANUAL", "AUTOMATIC"] },
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
          onDelete={canDelete ? handleDeleteRequest : undefined}
          deleteDisabled={!canDelete || selectedTickets.length === 0 || isDeleting}
          deleteLabel={
            isDeleting ? "Deleting..." : `Delete (${selectedTickets.length})`
          }
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
                className="inline-flex h-8 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100">
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
            <table className="w-full min-w-300 border-separate border-spacing-0">
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
                  <TableHead data="No" />
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
                      className="px-4 py-8 text-center text-sm text-zinc-500">
                      No tickets found for current filters.
                    </td>
                  </tr>
                )}

                {tickets.map((ticket, index) => {
                  const changeType = recentChanges[ticket.id];
                  const rowHighlightClass =
                    changeType === "new"
                      ? "bg-emerald-50/70 hover:bg-emerald-100/60"
                      : changeType === "updated"
                        ? "bg-amber-50/70 hover:bg-amber-100/60"
                        : ticket.isSlaViolated
                          ? "bg-red-50 hover:bg-red-100"
                          : "hover:bg-zinc-50";

                  return (
                    <tr
                      key={ticket.id}
                      className={`cursor-pointer border-b border-zinc-100 transition-colors ${rowHighlightClass}`}
                      onClick={() =>
                        router.push(`/helpdesk/tickets/${ticket.id}`)
                      }>
                    <td
                      className="px-3 py-3"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleSelectTicket(ticket.id);
                      }}>
                      <input
                        type="checkbox"
                        checked={selectedTickets.includes(ticket.id)}
                        className="accent-zinc-900"
                        onChange={() => undefined}
                      />
                    </td>

                    {/* <TableBody className="px-4 py-3 text-left">{index}</TableBody> */}

                    <TableBody data={String(index + 1 + ((currentPage - 1) * pageSize))} />

                    {visibleColumnKeys.map((column) => {
                      const cellContent = renderCell(
                        ticket,
                        column.key,
                        helpers,
                        changeType,
                      );

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
                  );
                })}
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
