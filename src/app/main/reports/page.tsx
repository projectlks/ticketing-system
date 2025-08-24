"use client";

import { useEffect, useState, useRef } from "react";
import TableBody from "@/components/TableBody";
import DotMenu from "@/components/DotMenu";
import TableHead from "@/components/TableHead";
import Loading from "@/components/Loading";
import { useRouter } from "next/navigation";
import { Ticket } from "@prisma/client";
import { getAllTickets } from "./action";
import Button from "@/components/Button";
// import { ArrowDownCircleIcon } from "@heroicons/react/24/outline";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import DateRangePicker from "./DateRangePicker";
import { ArrowDownCircleIcon } from "@heroicons/react/24/outline";

export type TicketWithRelations = Ticket & {
    assignedTo: { id: string; name: string; email: string } | null;
    requester: { id: string; name: string; email: string } | null;
    category: { id: string; name: string };
    subcategory: { id: string; name: string };
    department: { id: string; name: string };
    images: { id: string; url: string }[];
    comments: {
        id: string;
        content: string | null;
        commenter: { id: string; name: string };
    }[];
};

export default function Page() {
    const [tickets, setTickets] = useState<TicketWithRelations[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    const router = useRouter();
    const fetchTimeout = useRef<NodeJS.Timeout | null>(null);

    // Fetch all tickets
    const fetchTickets = async (filters?: { from?: string; to?: string }) => {
        setIsLoading(true);
        try {
            const { data } = await getAllTickets(filters);
            setTickets(data);
            setSelectedTickets([]); // clear selection on new fetch
        } finally {
            setIsLoading(false);
        }
    };

    // Debounced version
    const fetchTicketsDebounced = (filters?: { from?: string; to?: string }) => {
        if (fetchTimeout.current) clearTimeout(fetchTimeout.current);
        fetchTimeout.current = setTimeout(() => {
            fetchTickets(filters);
        }, 300); // 300ms debounce
    };

    useEffect(() => {
        // initial fetch
        fetchTickets();
    }, []);

    // Status and Priority colors
    type StatusType = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
    const statusColors: Record<StatusType | "DEFAULT", { bg: string; borderAndText: string }> = {
        OPEN: { bg: "bg-green-500", borderAndText: "border-green-500 text-green-500" },
        IN_PROGRESS: { bg: "bg-yellow-500", borderAndText: "border-yellow-500 text-yellow-500" },
        RESOLVED: { bg: "bg-blue-500", borderAndText: "border-blue-500 text-blue-500" },
        CLOSED: { bg: "bg-gray-500", borderAndText: "border-gray-500 text-gray-500" },
        DEFAULT: { bg: "bg-gray-500", borderAndText: "border-red-500 text-red-500" },
    };
    const getStatusColor = (status: string, type: "bg" | "borderAndText" = "bg") => {
        return statusColors[status as StatusType]?.[type] ?? statusColors.DEFAULT[type];
    };

    type PriorityType = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    const priorityColors: Record<PriorityType | "DEFAULT", { bg: string; borderAndText: string }> = {
        LOW: { bg: "bg-green-500", borderAndText: "border-green-500 text-green-500" },
        MEDIUM: { bg: "bg-yellow-500", borderAndText: "border-yellow-500 text-yellow-500" },
        HIGH: { bg: "bg-orange-500", borderAndText: "border-orange-500 text-orange-500" },
        URGENT: { bg: "bg-red-500", borderAndText: "border-red-500 text-red-500" },
        DEFAULT: { bg: "bg-gray-500", borderAndText: "border-gray-500 text-gray-500" },
    };
    const getPriorityColor = (priority: string, type: "bg" | "borderAndText" = "bg") => {
        return priorityColors[priority as PriorityType]?.[type] ?? priorityColors.DEFAULT[type];
    };

    // Selection functions
    const toggleSelectTicket = (id: string) => {
        setSelectedTickets((prev) =>
            prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
        );
    };

    // Example: selectedTickets holds IDs of tickets you want to export
    const downloadExcel = (tickets: TicketWithRelations[], selectedTickets: string[]) => {
        const dataToExport = tickets
            .filter((t) => selectedTickets.includes(t.id))
            .map((t) => ({
                TicketID: t.ticketId,
                Title: t.title,
                Description: t.description,
                Status: t.status,
                Priority: t.priority,
                CreatedAt: new Date(t.createdAt).toLocaleString("en-US", { timeZone: "Asia/Yangon" }),
                RequesterName: t.requester?.name ?? "-",
                RequesterEmail: t.requester?.email ?? "-",
                AssignedToName: t.assignedTo?.name ?? "-",
                AssignedToEmail: t.assignedTo?.email ?? "-",
                Category: t.category.name,
                Subcategory: t.subcategory.name,
                Department: t.department.name,
                Images: t.images.map((i) => i.url).join(", "),
                Comments: t.comments.map((c) => `${c.commenter.name}: ${c.content}`).join(" | "),
            }));

        if (dataToExport.length === 0) {
            alert("Please select tickets to download");
            return;
        }

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Tickets");

        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(blob, "tickets.xlsx");
    };

    // Fetch tickets automatically when date changes
    useEffect(() => {
        fetchTicketsDebounced({ from: fromDate, to: toDate });
    }, [fromDate, toDate]);

    return (
        <>
            {isLoading && <Loading />}
            <div className="w-full min-h-full bg-white pb-10 rounded-lg">
                {/* Header */}
                <div className="px-5 py-4 sm:px-6 sm:py-5 flex border-b border-gray-200 justify-between items-center">
                    <div className="flex items-center space-x-2">
                        <h1 className="text-sm text-gray-800">Reports</h1>
                    </div>

                    {/* Date Filter */}



                    {/* Date Range Picker */}
                    <DateRangePicker
                        fromDate={fromDate}
                        toDate={toDate}
                        setFromDate={setFromDate}
                        setToDate={setToDate}
                    />
                    {/* Excel Download */}
                    <div>
                        <button onClick={() => downloadExcel(tickets, selectedTickets)} className="bg-indigo-500 px-2 py-1 rounded text-gray-100">
                            <ArrowDownCircleIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div className="p-5">
                    {tickets.length > 0 ? (
                        <div className="rounded">
                            <div className="max-w-full overflow-x-auto">
                                <table className="w-full min-w-[1102px] border border-gray-200">
                                    <thead>
                                        <tr className="border-b border-gray-100">
                                            <th className="px-3">
                                                <input
                                                    type="checkbox"
                                                    onChange={(e) =>
                                                        e.target.checked
                                                            ? setSelectedTickets(tickets.map((t) => t.id))
                                                            : setSelectedTickets([])
                                                    }
                                                    checked={selectedTickets.length === tickets.length && tickets.length > 0}
                                                />
                                            </th>
                                            <TableHead data="No." />
                                            <TableHead data="Ticket ID" />
                                            <TableHead data="Title" />
                                            <TableHead data="Description" />
                                            <TableHead data="Status" />
                                            <TableHead data="Priority" />
                                            <TableHead data="Created At" />
                                            <TableHead data="Requester" />
                                            <TableHead data="Assigned To" />
                                            <TableHead data="Actions" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tickets.map((ticket, index) => (
                                            <tr
                                                onClick={() => router.push(`/main/tickets/view/${ticket.id}`)}
                                                key={ticket.id}
                                                className={`border-b border-gray-100 hover:bg-gray-50 border-l-4 ${ticket.assignedToId ? "border-l-green-500" : "border-l-red-500"
                                                    }`}
                                            >
                                                {/* Selection checkbox */}
                                                <td className="px-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedTickets.includes(ticket.id)}
                                                        onChange={() => toggleSelectTicket(ticket.id)}
                                                        onClick={(e) => e.stopPropagation()} // prevent row click
                                                    />
                                                </td>

                                                <TableBody data={String(index + 1)} />
                                                <TableBody data={ticket.ticketId} />
                                                <TableBody data={ticket.title} />
                                                <TableBody data={ticket.description} />
                                                {/* Status */}
                                                <td className="px-5 py-4 sm:px-6">
                                                    <div
                                                        className={`flex items-center px-2 py-1 rounded-full ${getStatusColor(
                                                            ticket.status,
                                                            "borderAndText"
                                                        )} space-x-2 border-[1px]`}
                                                    >
                                                        <span
                                                            className={`w-2 block aspect-square rounded-full ${getStatusColor(
                                                                ticket.status
                                                            )}`}
                                                        ></span>
                                                        <p className="text-xs truncate">{ticket.status}</p>
                                                    </div>
                                                </td>

                                                {/* Priority */}
                                                <td className="px-5 py-4 sm:px-6">
                                                    <div
                                                        className={`flex items-center px-2 py-1 rounded-full ${getPriorityColor(
                                                            ticket.priority,
                                                            "borderAndText"
                                                        )} space-x-2 border-[1px]`}
                                                    >
                                                        <span
                                                            className={`w-2 block aspect-square rounded-full ${getPriorityColor(
                                                                ticket.priority
                                                            )}`}
                                                        ></span>
                                                        <p className="text-xs truncate">{ticket.priority}</p>
                                                    </div>
                                                </td>

                                                <TableBody
                                                    data={new Date(ticket.createdAt).toLocaleString("en-US", {
                                                        timeZone: "Asia/Yangon",
                                                    })}
                                                />

                                                <td className="px-5 py-4 sm:px-6">
                                                    <p className="text-gray-500 truncate">{ticket.requester?.name ?? "-"}</p>
                                                    <p className="text-gray-500 text-xs truncate">{ticket.requester?.email ?? "-"}</p>
                                                </td>

                                                <td className="px-5 py-4 sm:px-6">
                                                    <p className="text-gray-500 truncate">{ticket.assignedTo?.name ?? "-"}</p>
                                                    <p className="text-gray-500 text-xs truncate">{ticket.assignedTo?.email ?? "-"}</p>
                                                </td>

                                                <td className="px-5 py-4 flex items-center space-x-3 sm:px-6">
                                                    <DotMenu
                                                        isBottom={index >= tickets.length - 2}
                                                        option={{ view: true }}
                                                        onView={() => router.push(`/main/tickets/view/${ticket.id}`)}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <p className="text-base text-center text-gray-500">No tickets found.</p>
                    )}
                </div>
            </div>
        </>
    );
}
