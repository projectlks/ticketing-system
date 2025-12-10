"use client";
import React, { useEffect, useState } from "react";
import Button from "@/components/Button";
import Searchbox from "@/components/SearchBox/SearchBox";
import TableBody from "@/components/TableBody";
import TableHead from "@/components/TableHead";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";
import { useStatusColor } from "@/hooks/useStatusColor";
import { usePriorityColor } from "@/hooks/usePriorityColor";
import { useRouter, useSearchParams } from "next/navigation";
import { getAllTickets } from "./action";
import { Ticket } from "@prisma/client";
import Countdown from "@/components/Countdown";

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
    { key: "responseDue", label: "Response Due" }, // new
    { key: "resolutionDue", label: "Resolution Due" }, // new
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
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
        Object.fromEntries(columns.map((col) => [col.key, 150]))
    );

    const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
    const [selectedSearchQueryFilters, setSelectedSearchQueryFilters] = useState<Record<string, string[]>>({});

    const [tickets, setTickets] = useState<TicketWithRelations[]>([]);
    const [totalTickets, setTotalTickets] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10); // tickets per page
    const totalPages = Math.ceil(totalTickets / pageSize);
    // const router = useRouter()

    const toggleColumn = (key: string) => {
        setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleSelectTicket = (id: string) => {
        setSelectedTickets((prev) =>
            prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedTickets.length === tickets.length) setSelectedTickets([]);
        else setSelectedTickets(tickets.map((t) => t.id));
    };

    const handleResize = (key: string, newWidth: number) => {
        setColumnWidths((prev) => ({ ...prev, [key]: newWidth }));
    };

    const getStatusColor = useStatusColor;
    const getPriorityColor = usePriorityColor;

    const searchParams = useSearchParams();
    const defaultFilter = searchParams.get("filter");
    const department = searchParams.get("department");
    const status = searchParams.get("status");
    const ownership = searchParams.get("ownership");
    const priority = searchParams.get("priority");
    // Priority

    const router = useRouter()

    // Default filter on route load
    useEffect(() => {
        if (defaultFilter) {
            setSelectedFilters({
                Ownership: [defaultFilter],
            });
        }
        if (department) {
            setSelectedSearchQueryFilters({
                department: [department],
            });
        } if (status) {
            setSelectedFilters({
                Status: [status],
            });
        }
        if (ownership) {
            setSelectedFilters({
                Ownership: [ownership],
            });
        }
        if (priority) {
            setSelectedFilters({
                Ownership: ["My Tickets"],
                Priority: [priority]

            });
        }


    }, [defaultFilter, department, status, ownership, priority]);

    // Fetch tickets whenever filters or search selections change
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

    return (
        <div className="p-4">
            {/* Top Bar */}
            <div className="flex justify-between items-center bg-white px-4 py-4 border-b border-gray-300">
                <div className="flex items-center space-x-2">
                    <Button click={() => router.push("/helpdesk/tickets/new")} buttonLabel="NEW" />
                    <h1 className="text-sm text-gray-800">Tickets</h1>
                </div>

                <Searchbox
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    placeholder="Search ..."
                    filterGroups={[
                        {
                            title: "Ownership",
                            options: ["My Tickets", "Assigned To Me", "Followed", "Unassigned"],
                        },
                        {
                            title: "Status",
                            options: ["NEW", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED", "CANCELED"],
                        },
                        {
                            title: "Priority",
                            options: ["REQUEST", "MINOR", "MAJOR", "CRITICAL"],
                        },
                        {
                            title: "Archived",
                            options: ["Archived", "UnArchived"],
                        },
                        {
                            title: "SLA",
                            options: ["Violated", "Not Violated"],
                        },
                    ]}
                    selectedFilters={selectedFilters}
                    setSelectedFilters={setSelectedFilters}
                    columns={columns}
                    selectedSearchQueryFilters={selectedSearchQueryFilters}
                    setSelectedSearchQueryFilters={setSelectedSearchQueryFilters}
                />

                {/* Column Selector */}
                <div className="flex items-center space-x-2">
                    <div className="flex items-center justify-between px-4">
                        {/* Page Size Selector */}
                        <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-700">Show:</span>
                            <select
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setCurrentPage(1); // reset to first page
                                }}
                                className="border rounded px-2 py-1 text-sm"
                            >
                                {[5, 10, 15, 20, 25].map((size) => (
                                    <option key={size} value={size}>{size}</option>
                                ))}
                            </select>
                        </div>

                        {/* Pagination Controls */}
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>

                            <span className="text-sm text-gray-700">
                                Page {currentPage} of {totalPages}
                            </span>

                            <button
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div className="relative h-full group">
                        <AdjustmentsHorizontalIcon className="w-6 h-6 cursor-pointer" />
                        <div className="absolute right-0 w-40 bg-white border border-gray-200 rounded-md shadow-md hidden group-hover:block z-10">
                            {columns
                                .filter((col) => col.key !== "title")
                                .map((col) => (
                                    <label
                                        key={col.key}
                                        className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={visibleColumns[col.key]}
                                            onChange={() => toggleColumn(col.key)}
                                            className="mr-2 accent-main"
                                        />
                                        <span className="capitalize text-xs text-gray-700">{col.label}</span>
                                    </label>
                                ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="w-full overflow-x-auto bg-white mt-4 border border-gray-200 rounded">
                {/* Table Header */}
                <div className="flex border-b border-gray-200">
                    <div className="w-12 flex items-center justify-center border-r border-gray-200">
                        <input
                            type="checkbox"
                            checked={selectedTickets.length === tickets.length && tickets.length > 0}
                            onChange={toggleSelectAll}
                            className="accent-main"
                        />
                    </div>

                    {columns.map(
                        (col) =>
                            visibleColumns[col.key] && (
                                <ResizableBox
                                    key={col.key}
                                    width={columnWidths[col.key]}
                                    height={40}
                                    axis="x"
                                    minConstraints={[120, 40]}
                                    maxConstraints={[500, 40]}
                                    onResize={(e, data) => handleResize(col.key, data.size.width)}
                                    resizeHandles={["e"]}
                                    handle={<span className="absolute right-0 top-0 h-full w-0.5 cursor-col-resize bg-gray-300" />}
                                >
                                    <TableHead key={col.key} data={col.label} width={columnWidths[col.key]} />
                                </ResizableBox>
                            )
                    )}
                </div>

                {/* Table Body */}
                <div>
                    {tickets.map((ticket) => (
                        <div
                            key={ticket.id}
                            onClick={() => router.push(`/helpdesk/tickets/${ticket.id}`)}
                            className="flex border-b items-center border-gray-100 hover:bg-gray-50"
                        >
                            {/* Row checkbox */}
                            <div className="w-12 flex items-center justify-center">
                                <input
                                    type="checkbox"
                                    checked={selectedTickets.includes(ticket.id)}
                                    onChange={() => toggleSelectTicket(ticket.id)}
                                    className="accent-main"
                                />
                            </div>

                            {columns.map((col) => {
                                if (!visibleColumns[col.key]) return null;

                                const cellRenderers: Record<string, React.ReactNode> = {
                                    ticketId: ticket.ticketId,
                                    title: ticket.title,
                                    description: ticket.description,
                                    department: ticket.department?.name,
                                    status: (
                                        <div key={Math.random()} className="px-5 py-2 sm:px-6" style={{ width: columnWidths[col.key] }}>
                                            <div
                                                className={`flex items-center w-fit pr-3 px-2  rounded-full  border-gray-300 ${getStatusColor(ticket.status, "borderAndText")} space-x-2 border`}
                                            >
                                                <span
                                                    className={`w-1.5 block aspect-square rounded-full ${getStatusColor(ticket.status)}`}
                                                />
                                                <p className="text-sm truncate text-gray-700">
                                                    {ticket.status.toLocaleLowerCase()}
                                                </p>
                                            </div>
                                        </div>
                                    ),
                                    priority: (
                                        <div key={Math.random()} className="px-5 py-2 sm:px-6" style={{ width: columnWidths[col.key] }}>
                                            <div
                                                className={`flex items-center w-fit pr-3 px-2  rounded-full border-gray-300 space-x-1.5 ${getPriorityColor(ticket.priority || '', "borderAndText")} h-6 border`}
                                            >
                                                <span
                                                    className={`w-1.5 block aspect-square rounded-full ${getPriorityColor(ticket.priority || '')}`}
                                                />
                                                <p className="text-sm truncate text-gray-700">
                                                    {ticket.priority?.toLocaleLowerCase()}
                                                </p>
                                            </div>
                                        </div>
                                    ),
                                    createdAt: new Date(ticket.createdAt).toLocaleString(
                                        "en-US",
                                        { timeZone: "Asia/Yangon" }
                                    ),
                                    requester: (
                                        <div style={{ width: columnWidths[col.key] }} key={col.key} className="px-5 py-4 sm:px-6">
                                            <p className="text-gray-500 text-[14px] truncate">
                                                {ticket.requester?.name || "-"}
                                            </p>
                                            <p className="text-gray-500 text-xs truncate">
                                                {ticket.requester?.email || "-"}
                                            </p>
                                        </div>
                                    ),
                                    assignedTo: (
                                        <div key={col.key} style={{ width: columnWidths[col.key] }} className="px-5 py-4 sm:px-6">
                                            <p className="text-gray-500 text-[14px] truncate">
                                                {ticket.assignedTo?.name || "-"}
                                            </p>
                                            <p className="text-gray-500 text-xs truncate">
                                                {ticket.assignedTo?.email || "-"}
                                            </p>
                                        </div>
                                    ),
                                    isSlaViolated: ticket.isSlaViolated ? "Yes" : "No",
                                    actions: "...",
                                    responseDue: ticket.responseDue ? (
                                        <div style={{ width: columnWidths["responseDue"] }} className="px-5 py-2 sm:px-6">
                                            <Countdown targetTime={ticket.responseDue.toString()} />
                                        </div>
                                    ) : "-",

                                    resolutionDue: ticket.resolutionDue ? (
                                        <div style={{ width: columnWidths["resolutionDue"] }} className="px-5 py-2 sm:px-6">
                                            <Countdown targetTime={ticket.resolutionDue.toString()} />
                                        </div>
                                    ) : "-",

                                };

                                const cellContent = cellRenderers[col.key];

                                return React.isValidElement(cellContent) ? (
                                    cellContent
                                ) : (
                                    <TableBody
                                        key={col.key}
                                        data={cellContent as string | number}
                                        width={columnWidths[col.key]}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
