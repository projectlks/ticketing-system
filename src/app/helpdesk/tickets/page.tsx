"use client";

import React, { useEffect, useState, useMemo } from "react";
import TableBody from "@/components/TableBody";
import TableHead from "@/components/TableHead";
import TableFooter from "./TableFooter";
import TableTopBar from "./TableTopBar";
import { useStatusColor } from "@/hooks/useStatusColor";
import { usePriorityColor } from "@/hooks/usePriorityColor";
import { useRouter, useSearchParams } from "next/navigation";
import { getAllTickets } from "./action";
import { renderCell, RenderCellHelpers } from "./renderCell";
import { Ticket } from "@/generated/prisma/client";

export type TicketWithRelations = Ticket & {
    requester?: { name: string; email: string } | null;
    assignedTo?: { name: string; email: string } | null;
    department: { id: string; name: string } | null;
};

const columns = [
    { key: "ticketId", label: "Ticket ID" },
    { key: "title", label: "Title" },
    { key: "description", label: "Description" },
    { key: "status", label: "Status" },
    { key: "department", label: "Department" },
    { key: "priority", label: "Priority" },
    { key: "createdAt", label: "Created At" },
    { key: "responseDue", label: "Response Due" },
    { key: "resolutionDue", label: "Resolution Due" },
    { key: "requester", label: "Requester" },
    { key: "assignedTo", label: "Assigned To" },
    { key: "isSlaViolated", label: "SLA Violated" },
];

export interface GetTicketsOptions {
    search?: Record<string, string[]>;
    filters?: Record<string, string[]>;
    page?: number;
    pageSize?: number;
}

export default function Page() {
    const [visibleColumns, setVisibleColumns] = useState(
        Object.fromEntries(columns.map((col) => [col.key, true]))
    );
    const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
    const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
    const [selectedSearchQueryFilters, setSelectedSearchQueryFilters] = useState<Record<string, string[]>>({});
    const [tickets, setTickets] = useState<TicketWithRelations[]>([]);
    const [totalTickets, setTotalTickets] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const totalPages = Math.ceil(totalTickets / pageSize);

    const getStatusColor = useStatusColor;
    const getPriorityColor = usePriorityColor;
    const router = useRouter();
    const searchParams = useSearchParams();

    // Merge default filters from URL
    useEffect(() => {
        const newFilters: Record<string, string[]> = {};
        if (searchParams.get("filter")) newFilters.Ownership = [searchParams.get("filter")!];
        if (searchParams.get("status")) newFilters.Status = [searchParams.get("status")!];
        if (searchParams.get("ownership")) newFilters.Ownership = [searchParams.get("ownership")!];
        if (searchParams.get("priority")) newFilters.Priority = [searchParams.get("priority")!];

        setSelectedFilters((prev) => ({ ...prev, ...newFilters }));

        const newSearchFilters: Record<string, string[]> = {};
        if (searchParams.get("department")) newSearchFilters.department = [searchParams.get("department")!];
        setSelectedSearchQueryFilters((prev) => ({ ...prev, ...newSearchFilters }));
    }, [searchParams]);

    // Fetch tickets whenever filters/search/page change
    useEffect(() => {
        const fetchData = async () => {
            const { tickets: data, total } = await getAllTickets({
                search: selectedSearchQueryFilters,
                filters: selectedFilters,
                page: currentPage,
                pageSize,
            });
            setTickets(data);
            setTotalTickets(total);
        };
        fetchData();
    }, [selectedFilters, selectedSearchQueryFilters, currentPage, pageSize]);

    // Column toggle
    const toggleColumn = (key: string) => {
        setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    // Row selection
    const toggleSelectTicket = (id: string) => {
        setSelectedTickets((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
    };
    const toggleSelectAll = () => {
        if (selectedTickets.length === tickets.length) setSelectedTickets([]);
        else setSelectedTickets(tickets.map((t) => t.id));
    };

    // CSV download
    const handleExcelDownload = () => {
        const selectedData = tickets.filter((t) => selectedTickets.includes(t.id));
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

        const rows = selectedData.map((t) => [
            t.ticketId,
            t.title,
            t.description,
            t.status,
            t.priority ?? "",
            t.department?.name ?? "",
            t.requester?.name ?? "",
            t.assignedTo?.name ?? "",
            new Date(t.createdAt).toLocaleString("en-US", { timeZone: "Asia/Yangon" }),
            t.isSlaViolated ? "Yes" : "No",
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `tickets-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };



    // inside your component
    const helpers: RenderCellHelpers = { getStatusColor, getPriorityColor };
    // Render cell helper

    // Memoized visible columns
    const visibleColumnKeys = useMemo(() => columns.filter((col) => visibleColumns[col.key]), [columns, visibleColumns]);

    return (
        <div className="p-4">
            {/* Top Bar */}
            <TableTopBar
                title="Tickets"
                onNew={() => router.push("/helpdesk/tickets/new")}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                filterGroups={[
                    { title: "Ownership", options: ["My Tickets", "Assigned To Me", "Followed", "Unassigned"] },
                    { title: "Status", options: ["NEW", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED", "CANCELED"] },
                    { title: "Priority", options: ["REQUEST", "MINOR", "MAJOR", "CRITICAL"] },
                    { title: "Archived", options: ["Archived", "UnArchived"] },
                    { title: "SLA", options: ["Violated", "Not Violated"] },
                ]}
                selectedFilters={selectedFilters}
                setSelectedFilters={setSelectedFilters}
                columns={columns}
                selectedSearchQueryFilters={selectedSearchQueryFilters}
                setSelectedSearchQueryFilters={setSelectedSearchQueryFilters}
                visibleColumns={visibleColumns}
                toggleColumn={toggleColumn}
                onDownload={handleExcelDownload}
                downloadDisabled={selectedTickets.length === 0}
            />

            {/* Table */}
            <div className="w-full overflow-x-auto">
                <table className="w-full bg-white mt-4 border border-gray-200 rounded">
                    <thead className="border-b border-gray-200">
                        <tr>
                            <th className="min-w-12">
                                <input
                                    type="checkbox"
                                    checked={selectedTickets.length === tickets.length && tickets.length > 0}
                                    onChange={toggleSelectAll}
                                    className="accent-main block mx-auto"
                                />
                            </th>
                            {visibleColumnKeys.map((col) => (
                                <TableHead key={col.key} data={col.label} />
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {tickets.map((ticket) => (
                            <tr
                                key={ticket.id}
                                className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                                onClick={() => router.push(`/helpdesk/tickets/${ticket.id}`)}
                            >
                                {/* Row checkbox */}
                                <td
                                    className="hover:bg-gray-200"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleSelectTicket(ticket.id);
                                    }}
                                >
                                    <input type="checkbox" checked={selectedTickets.includes(ticket.id)} className="accent-main block mx-auto" />
                                </td>



                                {visibleColumnKeys.map((col) => {
                                    const cellContent = renderCell(ticket, col.key, helpers);
                                    return React.isValidElement(cellContent) ? cellContent : <TableBody key={col.key} data={cellContent as string} />;
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <TableFooter pageSize={pageSize} setPageSize={setPageSize} currentPage={currentPage} setCurrentPage={setCurrentPage} totalPages={totalPages} />
        </div>
    );
}

