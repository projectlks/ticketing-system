import React from "react";
import Countdown from "@/components/Countdown";
import { TicketWithRelations } from "@/app/helpdesk/tickets/page";
import PillBadge from "@/components/ticket/PillBadge";
import { formatMyanmarDateTime } from "@/libs/myanmar-date-time";

export type RenderCellHelpers = {
  getStatusColor: (status: string, type?: "borderAndText") => string;
  getPriorityColor: (priority: string, type?: "borderAndText") => string;
  getCreationModeColor: (mode: string, type?: "borderAndText") => string;
};

export const renderCell = (
  ticket: TicketWithRelations,
  columnKey: string,
  helpers: RenderCellHelpers,
  changeType?: "new" | "updated",
) => {
  const { getStatusColor, getPriorityColor, getCreationModeColor } = helpers;

  switch (columnKey) {
    case "ticketId":
      return (
        <td className="max-w-[420px] px-4 py-3">
          <div className="relative pr-16">
            <div className="truncate text-sm text-zinc-700">
              {ticket.ticketId}
            </div>
            {changeType && (
              <span
                className={`absolute right-0 top-1/2 -translate-y-1/2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  changeType === "new"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}>
                {changeType === "new" ? "New" : "Updated"}
              </span>
            )}
          </div>
        </td>
      );

    case "title":
      return ticket.title;

    case "description":
      return ticket.description;

    case "department":
      return ticket.department?.name ?? "-";

    case "status":
      return (
        <td className="px-4 py-3">
          <PillBadge
            label={ticket.status.replace("_", " ").toLowerCase()}
            toneClass={getStatusColor(ticket.status, "borderAndText")}
            dotClass={getStatusColor(ticket.status)}
          />
        </td>
      );

    case "priority":
      return (
        <td className="px-4 py-3">
          <PillBadge
            label={(ticket.priority || "-").toLowerCase()}
            toneClass={getPriorityColor(ticket.priority || "", "borderAndText")}
            dotClass={getPriorityColor(ticket.priority || "")}
          />
        </td>
      );

    case "createdAt":
      return formatMyanmarDateTime(ticket.createdAt);

    case "creationMode":
      if (!ticket.creationMode) return "-";
      return (
        <td className="px-4 py-3">
          <PillBadge
            label={ticket.creationMode.replace("_", " ").toLowerCase()}
            toneClass={getCreationModeColor(ticket.creationMode, "borderAndText")}
            dotClass={getCreationModeColor(ticket.creationMode)}
          />
        </td>
      );

    case "requester":
      return (
        <td className="px-4 py-3">
          <p className="truncate text-sm text-zinc-700">
            {ticket.requester?.name || "-"}
          </p>
          <p className="truncate text-xs text-zinc-500">
            {ticket.requester?.email || "-"}
          </p>
        </td>
      );

    case "assignedTo":
      return (
        <td className="px-4 py-3">
          <p className="truncate text-sm text-zinc-700">
            {ticket.assignedTo?.name || "-"}
          </p>
          <p className="truncate text-xs text-zinc-500">
            {ticket.assignedTo?.email || "-"}
          </p>
        </td>
      );

    case "isSlaViolated":
      return ticket.isSlaViolated ? "Yes" : "No";

    // case "responseDue":
    //   return ticket.responseDue ? (
    //     <td className="px-4 py-3">
    //       <Countdown targetTime={ticket.responseDue.toString()} />
    //     </td>
    //   ) : (
    //     "-"
    //   );

    // case "resolutionDue":
    //   return ticket.resolutionDue ? (
    //     <td className="px-4 py-3">
    //       <Countdown targetTime={ticket.resolutionDue.toString()} />
    //     </td>
    //   ) : (
    //     "-"
    //   );

    case "resolutionDue": {
      const isClosed = ticket.status.toLowerCase() === "closed" || ticket.status.toLowerCase() === "resolved";

      if (!ticket.resolutionDue || isClosed) return "-";

      return (
        <td className="px-4 py-3">
          <Countdown targetTime={ticket.resolutionDue.toString()} />
        </td>
      );
    }

    default:
      return "-";
  }
};
