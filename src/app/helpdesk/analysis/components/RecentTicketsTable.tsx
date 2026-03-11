"use client";

import type { AnalysisRecentTicket } from "../action";
import PillBadge from "@/components/ticket/PillBadge";
import { usePriorityColor } from "@/hooks/usePriorityColor";
import { useStatusColor } from "@/hooks/useStatusColor";

type RecentTicketsTableProps = {
  recentTickets: AnalysisRecentTicket[];
};

const mapPriorityToTone = (priority: AnalysisRecentTicket["priority"]) => {
  switch (priority) {
    case "high":
      return "CRITICAL";
    case "medium":
      return "MINOR";
    case "low":
      return "REQUEST";
  }
  return "REQUEST";
};

const mapStatusToTone = (status: AnalysisRecentTicket["status"]) => {
  switch (status) {
    case "open":
      return "OPEN";
    case "pending":
      return "IN_PROGRESS";
    case "closed":
      return "CLOSED";
  }
  return "OPEN";
};

export default function RecentTicketsTable({
  recentTickets,
}: RecentTicketsTableProps) {
  const getPriorityColor = usePriorityColor;
  const getStatusColor = useStatusColor;

  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight mb-6">Recent Tickets</h2>

      <div className="rounded-2xl bg-white border border-black/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-black/5">
            <tr>
              <th className="px-6 py-4 text-left font-medium text-black/60">Ticket</th>
              <th className="px-6 py-4 text-left font-medium text-black/60">
                Department
              </th>
              <th className="px-6 py-4 text-left font-medium text-black/60">Priority</th>
              <th className="px-6 py-4 text-left font-medium text-black/60">Status</th>
              <th className="px-6 py-4 text-left font-medium text-black/60">Created</th>
            </tr>
          </thead>

          <tbody>
            {recentTickets.length === 0 && (
              <tr>
                <td className="px-6 py-6 text-black/60" colSpan={5}>
                  No tickets found for this date range.
                </td>
              </tr>
            )}

            {recentTickets.map((ticket) => (
              <tr
                key={ticket.id}
                className="border-t border-black/5 hover:bg-black/5 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="font-medium">{ticket.title}</div>
                  <div className="text-xs text-black/50">{ticket.id}</div>
                </td>

                <td className="px-6 py-4 text-black/60">{ticket.department}</td>

                {/* Priority/Status badge color mapping ကို helper object မှာသတ်မှတ်ထားလို့
                    string comparison logic မပြန့်ဘဲ UI styling rule ကိုတစ်နေရာထဲထိန်းနိုင်ပါတယ်။ */}
                <td className="px-6 py-4 capitalize">
                  <PillBadge
                    label={ticket.priority}
                    toneClass={getPriorityColor(
                      mapPriorityToTone(ticket.priority),
                      "borderAndText",
                    )}
                    dotClass={getPriorityColor(mapPriorityToTone(ticket.priority))}
                  />
                </td>

                <td className="px-6 py-4 capitalize text-black/60">
                  <PillBadge
                    label={ticket.status}
                    toneClass={getStatusColor(
                      mapStatusToTone(ticket.status),
                      "borderAndText",
                    )}
                    dotClass={getStatusColor(mapStatusToTone(ticket.status))}
                  />
                </td>

                <td className="px-6 py-4 text-black/60">{ticket.created}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
