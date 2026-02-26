import React from "react";
import Countdown from "@/components/Countdown";
import { TicketWithRelations } from "@/app/helpdesk/tickets/page";

export type RenderCellHelpers = {
  getStatusColor: (status: string, type?: "borderAndText") => string;
  getPriorityColor: (priority: string, type?: "borderAndText") => string;
};

export const renderCell = (
  ticket: TicketWithRelations,
  columnKey: string,
  helpers: RenderCellHelpers,
) => {
  const { getStatusColor, getPriorityColor } = helpers;

  switch (columnKey) {
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
        <td className="px-4 py-3">
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusColor(
              ticket.status,
              "borderAndText",
            )}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${getStatusColor(ticket.status)}`}
            />
            {ticket.status.toLowerCase()}
          </span>
        </td>
      );

    case "priority":
      return (
        <td className="px-4 py-3">
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium ${getPriorityColor(
              ticket.priority || "",
              "borderAndText",
            )}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${getPriorityColor(
                ticket.priority || "",
              )}`}
            />
            {(ticket.priority || "-").toLowerCase()}
          </span>
        </td>
      );

    case "createdAt":
      return new Date(ticket.createdAt).toLocaleString("en-US", {
        timeZone: "Asia/Yangon",
      });

    case "requester":
      return (
        <td className="px-4 py-3">
          <p className="truncate text-sm text-zinc-700">{ticket.requester?.name || "-"}</p>
          <p className="truncate text-xs text-zinc-500">
            {ticket.requester?.email || "-"}
          </p>
        </td>
      );

    case "assignedTo":
      return (
        <td className="px-4 py-3">
          <p className="truncate text-sm text-zinc-700">{ticket.assignedTo?.name || "-"}</p>
          <p className="truncate text-xs text-zinc-500">
            {ticket.assignedTo?.email || "-"}
          </p>
        </td>
      );

    case "isSlaViolated":
      return ticket.isSlaViolated ? "Yes" : "No";

    case "responseDue":
      return ticket.responseDue ? (
        <td className="px-4 py-3">
          <Countdown targetTime={ticket.responseDue.toString()} />
        </td>
      ) : (
        "-"
      );

    case "resolutionDue":
      return ticket.resolutionDue ? (
        <td className="px-4 py-3">
          <Countdown targetTime={ticket.resolutionDue.toString()} />
        </td>
      ) : (
        "-"
      );

    default:
      return "-";
  }
};
