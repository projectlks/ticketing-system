"use client";

import type { AnalysisRecentTicket } from "../action";

type RecentTicketsTableProps = {
  recentTickets: AnalysisRecentTicket[];
};

const priorityClassName: Record<AnalysisRecentTicket["priority"], string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-emerald-100 text-emerald-700",
};

const statusClassName: Record<AnalysisRecentTicket["status"], string> = {
  open: "bg-sky-100 text-sky-700",
  pending: "bg-violet-100 text-violet-700",
  closed: "bg-zinc-200 text-zinc-700",
};

export default function RecentTicketsTable({
  recentTickets,
}: RecentTicketsTableProps) {
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
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${priorityClassName[ticket.priority]}`}
                  >
                    {ticket.priority}
                  </span>
                </td>

                <td className="px-6 py-4 capitalize text-black/60">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusClassName[ticket.status]}`}
                  >
                    {ticket.status}
                  </span>
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
