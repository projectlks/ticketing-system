"use client";

import { useEffect, useState, useRef } from "react";
import TableBody from "@/components/TableBody";
import DotMenu from "@/components/DotMenu";
import TableHead from "@/components/TableHead";
import Loading from "@/components/Loading";
import { usePathname, useRouter } from "next/navigation";
import { Ticket } from "@prisma/client";
import { getAllTickets } from "./action";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import DateRangePicker from "./DateRangePicker";
import {
    ArrowDownCircleIcon,
    ArrowLongLeftIcon,
    ArrowLongRightIcon,
    ChevronDownIcon,
    MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import MultiFilter from "../tickets/multiFilter";
import Button from "@/components/Button";
import { useTranslations } from "next-intl";

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
    const [searchQuery, setSearchQuery] = useState("");
    const [filters, setFilters] = useState<{ key: string; value: string }[]>([]);
    const [take, setTake] = useState(10);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

    const router = useRouter();
    const fetchTimeout = useRef<NodeJS.Timeout | null>(null);

    const totalPages = Math.ceil(total / take);

    const fetchTickets = async (datefilters?: { from?: string; to?: string }) => {
        setIsLoading(true);
        let viewedFilter: "SEEN" | "UNSEEN" | undefined;

        const normalFilters = filters.filter((f) => {
            if (f.key === "Viewed") {
                viewedFilter =
                    f.value === "Seen"
                        ? "SEEN"
                        : f.value === "Unseen"
                            ? "UNSEEN"
                            : undefined;
                return false;
            }
            return true;
        });

        try {
            const { data, total } = await getAllTickets(
                datefilters,
                normalFilters,
                page,
                take,
                viewedFilter,
                searchQuery
            );
            setTickets(data);
            setTotal(total);
            setSelectedTickets([]);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchTicketsDebounced = (filters?: { from?: string; to?: string }) => {
        if (fetchTimeout.current) clearTimeout(fetchTimeout.current);
        fetchTimeout.current = setTimeout(() => {
            fetchTickets(filters);
        }, 300);
    };

    useEffect(() => {
        fetchTickets();
    }, []);

    useEffect(() => {
        setPage(1);
        fetchTicketsDebounced({ from: fromDate, to: toDate });
    }, [filters, searchQuery, fromDate, toDate]);

    useEffect(() => {
        fetchTicketsDebounced({ from: fromDate, to: toDate });
    }, [page, take]);

    const statusColors: Record<string, { bg: string; borderAndText: string }> = {
        OPEN: { bg: "bg-green-500", borderAndText: "border-green-500 text-green-500" },
        IN_PROGRESS: { bg: "bg-yellow-500", borderAndText: "border-yellow-500 text-yellow-500" },
        RESOLVED: { bg: "bg-blue-500", borderAndText: "border-blue-500 text-blue-500" },
        CLOSED: { bg: "bg-gray-500", borderAndText: "border-gray-500 text-gray-500" },
        DEFAULT: { bg: "bg-gray-500", borderAndText: "border-red-500 text-red-500" },
    };
    const getStatusColor = (status: string, type: "bg" | "borderAndText" = "bg") =>
        statusColors[status]?.[type] ?? statusColors.DEFAULT[type];

    const priorityColors: Record<string, { bg: string; borderAndText: string }> = {
        LOW: { bg: "bg-green-500", borderAndText: "border-green-500 text-green-500" },
        MEDIUM: { bg: "bg-yellow-500", borderAndText: "border-yellow-500 text-yellow-500" },
        HIGH: { bg: "bg-orange-500", borderAndText: "border-orange-500 text-orange-500" },
        URGENT: { bg: "bg-red-500", borderAndText: "border-red-500 text-red-500" },
        DEFAULT: { bg: "bg-gray-500", borderAndText: "border-gray-500 text-gray-500" },
    };
    const getPriorityColor = (priority: string, type: "bg" | "borderAndText" = "bg") =>
        priorityColors[priority]?.[type] ?? priorityColors.DEFAULT[type];

    const toggleSelectTicket = (id: string) => {
        setSelectedTickets((prev) =>
            prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
        );
    };

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

    const t = useTranslations("table");
    const tHeader = useTranslations("header");
    const pathname = usePathname();
    const segments = pathname.split("/");
    const locale = segments[2] || "en";

    return (
        <>
            {isLoading && <Loading />}

            <div className="w-full min-h-full bg-white dark:bg-gray-900 pb-10 rounded-lg relative">
                {/* Header */}
                <div className="px-5 py-4 sm:px-6 sm:py-5 flex border-b border-gray-200 dark:border-gray-700 justify-between items-center">
                    <div className="flex items-center space-x-2">
                        <h1 className="text-sm text-gray-800 dark:text-gray-100">{tHeader("reports.title")}</h1>
                    </div>

                    <div className="relative flex items-center space-x-2">
                        <input
                            type="text"
                            placeholder={tHeader("reports.placeholder")}
                            className="h-[34px] w-[350px] sm:w-[400px] md:w-[450px] rounded border border-gray-300 dark:border-gray-600 bg-transparent px-9 py-2 text-xs text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300/50"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <div className="absolute top-1/2 left-3 transform -translate-y-1/2 pointer-events-none text-gray-700 dark:text-gray-300 w-4 h-4">
                            <MagnifyingGlassIcon />
                        </div>
                        <MultiFilter filters={filters} setFilters={setFilters} />
                    </div>

                    <div className="flex space-x-2 items-center">
                        <DateRangePicker
                            fromDate={fromDate}
                            toDate={toDate}
                            setFromDate={setFromDate}
                            setToDate={setToDate}
                        />
                        <button
                            onClick={() => downloadExcel(tickets, selectedTickets)}
                            className="bg-indigo-500 px-2 py-1 rounded text-gray-100"
                        >
                            <ArrowDownCircleIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div className="p-5">
                    {tickets.length > 0 ? (
                        <div className="rounded">
                            <div className="max-w-full overflow-x-auto">
                                <table className="w-full min-w-[1102px] border border-gray-200 dark:border-gray-700">
                                    <thead>
                                        <tr className="border-b border-gray-100 dark:border-gray-700">
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
                                            <TableHead data={t("no")} />
                                            <TableHead data={t("ticketId")} />
                                            <TableHead data={t("title")} />
                                            <TableHead data={t("description")} />
                                            <TableHead data={t("status")} />
                                            <TableHead data={t("priority")} />
                                            <TableHead data={t("createdAt")} />
                                            <TableHead data={t("requester")} />
                                            <TableHead data={t("assignedTo")} />
                                            <TableHead data={t("actions")} />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tickets.map((ticket, index) => (
                                            <tr
                                                key={ticket.id}
                                                className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 border-l-4 ${ticket.assignedToId ? "border-l-green-500 dark:border-l-green-500" : "border-l-red-500 dark:border-l-red-500"}`}
                                            >
                                                <td className="px-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedTickets.includes(ticket.id)}
                                                        onChange={() => toggleSelectTicket(ticket.id)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </td>
                                                <TableBody data={String(index + 1)} />
                                                <TableBody data={ticket.ticketId} />
                                                <TableBody data={ticket.title} />
                                                <TableBody data={ticket.description} />
                                                <td className="px-5 py-4 sm:px-6">
                                                    <div className={`flex items-center px-2 py-1 rounded-full ${getStatusColor(ticket.status, "borderAndText")} space-x-2 border-[1px]`}>
                                                        <span className={`w-2 block aspect-square rounded-full ${getStatusColor(ticket.status)}`}></span>
                                                        <p className="text-xs truncate">{ticket.status}</p>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 sm:px-6">
                                                    <div className={`flex items-center px-2 py-1 rounded-full ${getPriorityColor(ticket.priority, "borderAndText")} space-x-2 border-[1px]`}>
                                                        <span className={`w-2 block aspect-square rounded-full ${getPriorityColor(ticket.priority)}`}></span>
                                                        <p className="text-xs truncate">{ticket.priority}</p>
                                                    </div>
                                                </td>
                                                <TableBody
                                                    data={new Date(ticket.createdAt).toLocaleString("en-US", {
                                                        timeZone: "Asia/Yangon",
                                                    })}
                                                />
                                                <td className="px-5 py-4 sm:px-6">
                                                    <p className="text-gray-500 dark:text-gray-300 truncate">{ticket.requester?.name ?? "-"}</p>
                                                    <p className="text-gray-500 dark:text-gray-400 text-xs truncate">{ticket.requester?.email ?? "-"}</p>
                                                </td>
                                                <td className="px-5 py-4 sm:px-6">
                                                    <p className="text-gray-500 dark:text-gray-300 truncate">{ticket.assignedTo?.name ?? "-"}</p>
                                                    <p className="text-gray-500 dark:text-gray-400 text-xs truncate">{ticket.assignedTo?.email ?? "-"}</p>
                                                </td>
                                                <td className="px-5 py-4 flex items-center space-x-3 sm:px-6">
                                                    <DotMenu
                                                        isBottom={index >= tickets.length - 2}
                                                        option={{ view: true }}
                                                        onView={() => router.push(`/lang/${locale}/main/tickets/view/${ticket.id}`)}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="flex justify-end gap-2 mt-4 items-center">
                                <Button
                                    click={() => setPage((prev) => Math.max(1, prev - 1))}
                                    disabled={page === 1 || isLoading}
                                    buttonLabel={
                                        <>
                                            <ArrowLongLeftIcon className="w-4 h-4" />
                                            <span> Prev</span>
                                        </>
                                    }
                                />
                                <Button
                                    click={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                                    disabled={page >= totalPages || isLoading}
                                    buttonLabel={
                                        <>
                                            <span>Next </span>
                                            <ArrowLongRightIcon className="w-4 h-4" />
                                        </>
                                    }
                                />

                                <div className="relative">
                                    <select
                                        id="take"
                                        value={take}
                                        onChange={(e) => {
                                            setPage(1);
                                            setTake(Number(e.target.value));
                                        }}
                                        className="h-[33px] rounded-lg border px-2 pr-5 py-1 text-xs text-gray-800 dark:text-gray-200 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300/50 appearance-none border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                                    >
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                        <option value={30}>30</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                        <option value={99999}>All</option>
                                    </select>
                                    <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                        <ChevronDownIcon className="w-3 h-3" />
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-base text-center text-gray-500 dark:text-gray-400">No tickets found.</p>
                    )}
                </div>
            </div>
        </>
    );
}
