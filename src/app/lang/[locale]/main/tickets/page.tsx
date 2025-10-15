"use client";

import Header from "@/components/Header";
import { useEffect, useState } from "react";
import Portal from "@/components/Portal";
import Form from "./Form";
import TableBody from "@/components/TableBody";
import DotMenu from "@/components/DotMenu";
import TableHead from "@/components/TableHead";
import Swal from "sweetalert2";
import Button from "@/components/Button";
import {
    ArrowLongRightIcon, ArrowLongLeftIcon
} from "@heroicons/react/24/outline";
import Loading from "@/components/Loading";
import { usePathname, useRouter } from "next/navigation";
import { deleteTicket, getAllTickets, markTicketAsViewed, restoreTickets } from "./action";
import MultiFilter from "./multiFilter";
import { useSession } from "next-auth/react";
import type { Ticket } from "@prisma/client";
import { useTicketCount } from "@/context/TicketCountContext";
import { useTranslations } from "next-intl";
import { useStatusColor } from "@/hooks/useStatusColor";
import { usePriorityColor } from "@/hooks/usePriority";

export type TicketWithRelations = Ticket & {
    assignedTo: {
        id: string;
        name: string;
        email: string;
    } | null;

    requester: {
        id: string;
        name: string;
        email: string;
    } | null;
    // viewed field, default false
    viewed: boolean;
}




export default function Page() {




    const [showForm, setShowForm] = useState(false);
    const [tickets, setTickets] = useState<TicketWithRelations[]>([]);
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const take = 10;
    const [updateID, setUpdateID] = useState<string | null>(null);
    const [isFetching, setIsFetching] = useState(false);
    const [filters, setFilters] = useState<{ key: string; value: string }[]>([]);


    const router = useRouter();

    const { refreshTicketCount } = useTicketCount();


    // call fetchTickets
    const fetchTickets = async (currentPage: number) => {
        try {
            let viewedFilter: "SEEN" | "UNSEEN" | undefined;

            // Separate "Viewed" filter from others
            const normalFilters = filters.filter(f => {
                if (f.key === "Viewed") {
                    viewedFilter =
                        f.value === "Seen"
                            ? "SEEN"
                            : f.value === "Unseen"
                                ? "UNSEEN"
                                : undefined;
                    return false; // exclude "Viewed" from normal filters
                }
                return true;
            });

            // Call backend with normal filters + viewedFilter
            const { data, total } = await getAllTickets(
                currentPage,
                searchQuery,
                normalFilters,
                viewedFilter
            );

            const totalPages = Math.ceil(total / take);

            // Handle page overflow
            if (currentPage > totalPages && totalPages > 0) {
                setPage(totalPages);
                return;
            }

            setTickets(data);
        } catch (error) {
            console.error("Failed to fetch tickets:", error);
        }
    };







    useEffect(() => {
        setIsFetching(true);
        const timeout = setTimeout(() => {
            fetchTickets(page).finally(() => setIsFetching(false));
        }, 300);

        return () => clearTimeout(timeout);
    }, [searchQuery, page, filters]);



    useEffect(() => {
        setPage(1);
    }, [searchQuery]);

    const handleDelete = async (id: string) => {
        try {
            const result = await Swal.fire({
                title: "Are you sure?",
                text: "You won’t be able to revert this!",
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#d33",
                cancelButtonColor: "#3085d6",
                confirmButtonText: "Yes, delete it!",
            });

            if (result.isConfirmed) {
                await deleteTicket(id);

                if (data?.user.role === "SUPER_ADMIN") {
                    setTickets(tickets.map(acc => acc.id === id ? { ...acc, isArchived: true } : acc));
                } else {

                    setTickets(tickets.filter((ticket) => ticket.id !== id));
                }





                Swal.fire({
                    title: "Deleted!",
                    text: "The ticket has been deleted.",
                    icon: "success",
                    timer: 1500,
                    showConfirmButton: false,
                });
            }
        } catch (error) {
            console.error("Failed to delete ticket:", error);
            Swal.fire({
                title: "Error!",
                text: "Failed to delete the ticket.",
                icon: "error",
            });
        }
    };

    const handleEdit = (e: React.MouseEvent<HTMLButtonElement>, id: string) => {
        e.stopPropagation()
        setUpdateID(id);
        setShowForm(true);
    };

    const handleRestore = async (id: string) => {
        try {
            const result = await Swal.fire({
                title: 'Are you sure?',
                text: 'Do you want to restore this account?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, restore it!',
            });

            if (result.isConfirmed) {
                // Update isArchived to false

                await restoreTickets(id);


                // Update UI
                setTickets(tickets.map(acc => acc.id === id ? { ...acc, isArchived: false } : acc));

                Swal.fire({
                    title: 'Restored!',
                    text: 'The account has been restored.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false,
                });
            }
        } catch (error) {
            console.error("Failed to restore account:", error);
            Swal.fire({
                title: 'Error!',
                text: 'Failed to restore the account.',
                icon: 'error',
            });
        }
    };








    

    const t = useTranslations("table");
    const tHeader = useTranslations("header");
    const { data } = useSession()

    const pathname = usePathname();
    const segments = pathname.split("/");
    const locale = segments[2] || "en";


    const getStatusColor = useStatusColor;
    const getPriorityColor = usePriorityColor;


    return (
        <>
            {isFetching && <Loading />}
            <div className="w-full min-h-full bg-white dark:bg-gray-900 pb-10 rounded-lg">
                <Header
                    title={tHeader("tickets.title")}
                    placeholder={tHeader("tickets.placeholder")}
                    click={() => setShowForm(true)}
                    setSearchQuery={setSearchQuery}
                    searchQuery={searchQuery}
                    showNewBtn={true}
                >
                    <MultiFilter filters={filters} setFilters={setFilters} />
                </Header>

                <div className="p-5">
                    {tickets.length > 0 ? (
                        <div className="rounded">
                            <div className="max-w-full overflow-x-auto">
                                <table className="w-full min-w-[1102px] border border-gray-200 dark:border-gray-700">
                                    <thead>
                                        <tr className="border-b border-gray-100 dark:border-gray-700">
                                            <TableHead data={t("no")} />
                                            <TableHead data={t("ticketId")} />
                                            <TableHead data={t("title")} />
                                            <TableHead data={t("description")} />
                                            <TableHead data={t("status")} />
                                            <TableHead data={t("priority")} />
                                            <TableHead data={t("createdAt")} />
                                            <TableHead data={t("requester")} />
                                            <TableHead data={t("assignedTo")} />

                                            <TableHead data={"isSlaViolated"} />
                                            <TableHead data={t("actions")} />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tickets.map((ticket, index) => (
                                            <tr


                                                onClick={async () => {
                                                    try {
                                                        await markTicketAsViewed(ticket.id);
                                                        refreshTicketCount();
                                                        router.push(`/lang/${locale}/main/tickets/view/${ticket.id}`);
                                                    } catch (err) {
                                                        console.error(err);
                                                    }
                                                }}


                                                key={ticket.id}
                                                className={`border-b border-gray-100 dark:border-gray-700 
                                        hover:bg-gray-50 dark:hover:bg-gray-800
                                        border-l-4 
                                        ${(ticket.isArchived || ticket.isSlaViolated) ? "bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800" : ""} 
                                        ${(!ticket.isArchived && !ticket.viewed) ? "bg-indigo-50 dark:bg-indigo-900 hover:bg-gray-50 dark:hover:bg-gray-800" : ""}
                                        ${ticket.assignedToId ? "border-l-green-500 dark:border-l-green-500" : "border-l-red-500 dark:border-l-red-500"}
                                    `}
                                            >
                                                <TableBody data={String((page - 1) * take + index + 1)} />
                                                <TableBody data={ticket.ticketId} />
                                                <TableBody data={ticket.title} />
                                                <TableBody data={ticket.description} />

                                                {/* Status */}
                                                <td className="px-5 py-4 sm:px-6">
                                                    <div
                                                        className={`flex items-center px-2 py-1 rounded-full ${getStatusColor(ticket.status, "borderAndText")} space-x-2 border`}
                                                    >
                                                        <span
                                                            className={`w-2 block aspect-square rounded-full ${getStatusColor(ticket.status)}`}
                                                        />
                                                        <p className="text-xs truncate text-gray-700 dark:text-gray-200">
                                                            {ticket.status}
                                                        </p>
                                                    </div>
                                                </td>

                                                {/* Priority */}
                                                <td className="px-5 py-4 sm:px-6">
                                                    <div
                                                        className={`flex items-center px-2 py-1 rounded-full ${getPriorityColor(ticket.priority || '', "borderAndText")} space-x-2 border`}
                                                    >
                                                        <span
                                                            className={`w-2 block aspect-square rounded-full ${getPriorityColor(ticket.priority || '')}`}
                                                        />
                                                        <p className="text-xs truncate text-gray-700 dark:text-gray-200">
                                                            {ticket.priority}
                                                        </p>
                                                    </div>
                                                </td>

                                                <TableBody
                                                    data={new Date(ticket.createdAt).toLocaleString("en-US", {
                                                        timeZone: "Asia/Yangon",
                                                    })}
                                                />

                                                {/* Requester */}
                                                <td className="px-5 py-4 sm:px-6">
                                                    <p className="text-gray-500 dark:text-gray-300 truncate">
                                                        {ticket.requester ? ticket.requester.name || "-" : "-"}
                                                    </p>
                                                    <p className="text-gray-500 dark:text-gray-400 text-xs truncate">
                                                        {ticket.requester ? ticket.requester.email || "-" : "-"}
                                                    </p>
                                                </td>

                                                {/* Assigned To */}
                                                <td className="px-5 py-4 sm:px-6">
                                                    <p className="text-gray-500 dark:text-gray-300 truncate">
                                                        {ticket.assignedTo ? ticket.assignedTo.name || "-" : "-"}
                                                    </p>
                                                    <p className="text-gray-500 dark:text-gray-400 text-xs truncate">
                                                        {ticket.assignedTo ? ticket.assignedTo.email || "-" : "-"}
                                                    </p>
                                                </td>
                                                <TableBody data={ticket.isSlaViolated ? "Yes" : "No"} />


                                                {/* Actions */}
                                                <td className="px-5 py-4 flex items-center space-x-3 sm:px-6">
                                                    <DotMenu
                                                        isBottom={index >= tickets.length - 2}
                                                        option={{
                                                            view: true,
                                                            edit: true,
                                                            // delete: data?.user.role === "SUPER_ADMIN" && !ticket.isArchived,
                                                            restore: data?.user.role === "SUPER_ADMIN" && ticket.isArchived,
                                                        }}
                                                        onRestore={() => handleRestore(ticket.id)}
                                                        // onDelete={() => handleDelete(ticket.id)}
                                                        onEdit={(e) => handleEdit(e, ticket.id)}
                                                        onView={async () => {
                                                            try {
                                                                await markTicketAsViewed(ticket.id);
                                                                refreshTicketCount();
                                                                router.push(`/lang/${locale}/main/tickets/view/${ticket.id}`);
                                                            } catch (err) {
                                                                console.error(err);
                                                            }
                                                        }}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="flex justify-end gap-2 mt-4">
                                <Button
                                    click={() => setPage((prev) => Math.max(1, prev - 1))}
                                    disabled={page === 1 || isFetching}
                                    buttonLabel={
                                        <>
                                            <ArrowLongLeftIcon className="w-4 h-4" />
                                            <span> Prev</span>
                                        </>
                                    }
                                />
                                <Button
                                    click={() => setPage((prev) => prev + 1)}
                                    disabled={tickets.length < take || isFetching}
                                    buttonLabel={
                                        <>
                                            <span>Next </span>
                                            <ArrowLongRightIcon className="w-4 h-4" />
                                        </>
                                    }
                                />
                            </div>
                        </div>
                    ) : (
                        <p className="text-base text-center text-gray-500 dark:text-gray-400">No tickets found.</p>
                    )}
                </div>
            </div>


            {showForm && (
                <Portal containerId="modal-root">
                    <Form setShowForm={setShowForm} setTickets={setTickets} updateID={updateID} setUpdateID={setUpdateID} />
                    <></>
                </Portal>
            )}
        </>
    );
}
