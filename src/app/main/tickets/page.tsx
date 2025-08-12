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
import { ArrowLongRightIcon, ArrowLongLeftIcon } from "@heroicons/react/24/outline";
import Loading from "@/components/Loading";
import { useRouter } from "next/navigation";
import { Ticket } from "@prisma/client";
import { deleteTicket, getAllTickets } from "./action";

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
}



export default function Page() {




    const [showForm, setShowForm] = useState(false);
    const [tickets, setTickets] = useState<TicketWithRelations[]>([]);
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const take = 10;
    const [updateID, setUpdateID] = useState<string | null>(null);
    const [isFetching, setIsFetching] = useState(false);

    const router = useRouter();

    const fetchTickets = async (currentPage: number) => {
        try {
            const { data, total } = await getAllTickets(currentPage, searchQuery);
            const totalPages = Math.ceil(total / take);

            if (currentPage > totalPages && totalPages > 0) {
                setPage(totalPages);
                return;
            } else {
                setTickets(data);
            }
        } catch (error) {
            console.error("Failed to fetch tickets:", error);
        }
    };

    useEffect(() => {
        setIsFetching(true);
        const delayDebounce = setTimeout(() => {
            fetchTickets(page).finally(() => setIsFetching(false));
        }, 300);

        return () => clearTimeout(delayDebounce);
    }, [searchQuery, page]);

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
                setTickets(tickets.filter((ticket) => ticket.id !== id));
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

    const handleEdit = (id: string) => {
        setUpdateID(id);
        setShowForm(true);
    };






    type StatusType = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

    const statusColors: Record<StatusType | "DEFAULT", { bg: string; borderAndText: string }> = {
        OPEN: { bg: "bg-green-500", borderAndText: "border-green-500 text-green-500" },
        IN_PROGRESS: { bg: "bg-yellow-500", borderAndText: "border-yellow-500 text-yellow-500" },
        RESOLVED: { bg: "bg-blue-500", borderAndText: "border-blue-500 text-blue-500" },
        CLOSED: { bg: "bg-gray-500", borderAndText: "border-gray-500 text-gray-500" },
        DEFAULT: { bg: "bg-gray-500", borderAndText: "border-red-500 text-red-500" },
    };

    function getStatusColor(
        status: string,
        type: "bg" | "borderAndText" = "bg"
    ): string {
        const key = status as StatusType;
        return statusColors[key]?.[type] ?? statusColors.DEFAULT[type];
    }



    type PriorityType = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

    const priorityColors: Record<PriorityType | "DEFAULT", { bg: string; borderAndText: string }> = {
        LOW: { bg: "bg-green-500", borderAndText: "border-green-500 text-green-500" },
        MEDIUM: { bg: "bg-yellow-500", borderAndText: "border-yellow-500 text-yellow-500" },
        HIGH: { bg: "bg-orange-500", borderAndText: "border-orange-500 text-orange-500" },
        URGENT: { bg: "bg-red-500", borderAndText: "border-red-500 text-red-500" },
        DEFAULT: { bg: "bg-gray-500", borderAndText: "border-gray-500 text-gray-500" },
    };

    function getPriorityColor(priority: string, type: "bg" | "borderAndText" = "bg"): string {
        if (priority in priorityColors) {
            return priorityColors[priority as keyof typeof priorityColors][type];
        }
        return priorityColors.DEFAULT[type];
    }





    return (
        <>
            {isFetching && <Loading />}
            <div className="w-full min-h-full bg-white pb-10 rounded-lg">
                <Header
                    title="Tickets"
                    placeholder="Search by title or status"
                    click={() => setShowForm(true)}
                    setSearchQuery={setSearchQuery}
                    searchQuery={searchQuery}
                />

                <div className="p-5">
                    {tickets.length > 0 ? (
                        <div className="rounded">
                            <div className="max-w-full overflow-x-auto">
                                <table className="w-full min-w-[1102px] border border-gray-200">
                                    <thead>
                                        <tr className="border-b border-gray-100">
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
                                                key={ticket.id}
                                                className="border-b border-gray-100 hover:bg-gray-50"
                                            >
                                                <TableBody data={String((page - 1) * take + index + 1)} />
                                                <TableBody data={ticket.ticketId} />
                                                <TableBody data={ticket.title} />
                                                <TableBody data={ticket.description} />
                                                {/* <TableBody data={ticket.status} /> */}
                                                <td className="px-5  py-4 sm:px-6">


                                                    <div className={`flex items-center px-2 py-1 rounded-full ${getStatusColor(ticket.status, "borderAndText")} space-x-2  border-[1px]`}>


                                                        <span className={`w-2 block aspect-square rounded-full ${getStatusColor(ticket.status)}`}>

                                                        </span>
                                                        <p className=" text-xs truncate">
                                                            {ticket.status}
                                                        </p>
                                                    </div>
                                                </td>


                                                {/* <TableBody data={ticket.priority} /> */}

                                                <td className="px-5  py-4 sm:px-6">


                                                    <div className={`flex items-center px-2 py-1 rounded-full ${getPriorityColor(ticket.priority, "borderAndText")} space-x-2  border-[1px]`}>


                                                        <span className={`w-2 block aspect-square rounded-full ${getPriorityColor(ticket.priority)}`}>

                                                        </span>
                                                        <p className=" text-xs truncate">
                                                            {ticket.priority}
                                                        </p>
                                                    </div>
                                                </td>
                                                <TableBody
                                                    data={new Date(ticket.createdAt).toLocaleString("en-US", {
                                                        timeZone: "Asia/Yangon",
                                                    })}
                                                />


                                                <td className="px-5 py-4 sm:px-6">
                                                    <p className="text-gray-500 truncate">
                                                        {ticket.requester ? ticket.requester.name || "-" : "-"}
                                                    </p>
                                                    <p className="text-gray-500 text-xs truncate">
                                                        {ticket.requester ? ticket.requester.email || "-" : "-"}
                                                    </p>
                                                </td>

                                                <td className="px-5 py-4 sm:px-6">
                                                    <p className="text-gray-500 truncate">
                                                        {ticket.assignedTo ? ticket.assignedTo.name || "-" : "-"}
                                                    </p>
                                                    <p className="text-gray-500 text-xs truncate">
                                                        {ticket.assignedTo ? ticket.assignedTo.email || "-" : "-"}
                                                    </p>
                                                </td>



                                                <td className="px-5 py-4 flex items-center space-x-3 sm:px-6">
                                                    <DotMenu
                                                        isBottom={index >= tickets.length - 2}
                                                        option={{
                                                            view: true,
                                                            edit: true,
                                                            delete: true,
                                                        }}
                                                        onDelete={() => handleDelete(ticket.id)}
                                                        onEdit={() => handleEdit(ticket.id)}
                                                        onView={() => router.push(`/main/tickets/view/${ticket.id}`)}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

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
                        <p className="text-base text-center text-gray-500">No tickets found.</p>
                    )}
                </div>
            </div>

            {showForm && (
                <Portal>
                    <Form setShowForm={setShowForm} setTickets={setTickets} updateID={updateID} />
                    <></>
                </Portal>
            )}
        </>
    );
}
