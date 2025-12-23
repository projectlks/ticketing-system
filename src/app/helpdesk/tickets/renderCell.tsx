import React from "react";
import { TicketWithRelations } from "@/app/helpdesk/tickets/page"; // adjust path
import Countdown from "@/components/Countdown";

export type RenderCellHelpers = {
    getStatusColor: (status: string, type?: "borderAndText") => string;
    getPriorityColor: (priority: string, type?: "borderAndText") => string;
};

export const renderCell = (ticket: TicketWithRelations, colKey: string, helpers: RenderCellHelpers) => {
    const { getStatusColor, getPriorityColor } = helpers;

    switch (colKey) {
        case "ticketId":
            return ticket.ticketId;
        case "title":
            return ticket.title;
        case "description":
            return ticket.description;
        case "department":
            return ticket.department?.name ?? "-";
        case "status":
            return (
                <td className="px-5 py-2 sm:px-6">
                    <div
                        className={`flex items-center w-fit pr-3 px-2 rounded-full border-gray-300 ${getStatusColor(
                            ticket.status,
                            "borderAndText"
                        )} space-x-2 border`}
                    >
                        <span className={`w-1.5 block aspect-square rounded-full ${getStatusColor(ticket.status)}`} />
                        <p className="text-sm truncate text-gray-700">{ticket.status.toLocaleLowerCase()}</p>
                    </div>
                </td>
            );
        case "priority":
            return (
                <td className="px-5 py-2 sm:px-6">
                    <div
                        className={`flex items-center w-fit pr-3 px-2 rounded-full border-gray-300 space-x-1.5 ${getPriorityColor(
                            ticket.priority || "",
                            "borderAndText"
                        )} h-6 border`}
                    >
                        <span className={`w-1.5 block aspect-square rounded-full ${getPriorityColor(ticket.priority || "")}`} />
                        <p className="text-sm truncate text-gray-700">{ticket.priority?.toLocaleLowerCase()}</p>
                    </div>
                </td>
            );
        case "createdAt":
            return new Date(ticket.createdAt).toLocaleString("en-US", { timeZone: "Asia/Yangon" });
        case "requester":
            return (
                <td className="px-5 py-4 sm:px-6">
                    <p className="text-gray-500 text-[14px] truncate">{ticket.requester?.name || "-"}</p>
                    <p className="text-gray-500 text-xs truncate">{ticket.requester?.email || "-"}</p>
                </td>
            );
        case "assignedTo":
            return (
                <td className="px-5 py-4 sm:px-6">
                    <p className="text-gray-500 text-[14px] truncate">{ticket.assignedTo?.name || "-"}</p>
                    <p className="text-gray-500 text-xs truncate">{ticket.assignedTo?.email || "-"}</p>
                </td>
            );
        case "isSlaViolated":
            return ticket.isSlaViolated ? "Yes" : "No";
        case "responseDue":
            return ticket.responseDue ? <td className="px-5 py-2 sm:px-6"><Countdown targetTime={ticket.responseDue.toString()} /></td> : "-";
        case "resolutionDue":
            return ticket.resolutionDue ? <td className="px-5 py-2 sm:px-6"><Countdown targetTime={ticket.resolutionDue.toString()} /></td> : "-";
        default:
            return "-";
    }








};
