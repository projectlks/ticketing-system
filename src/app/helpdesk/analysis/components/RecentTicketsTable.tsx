"use client";

import type { AnalysisRecentTicket } from "../action";

type RecentTicketsTableProps = {
  recentTickets: AnalysisRecentTicket[];
};

export default function RecentTicketsTable({
  recentTickets,
}: RecentTicketsTableProps) {
  // Recent ticket list ကို table component သီးသန့်ခွဲထားလို့
  // sorting/column extension လုပ်ချင်ရင် ဒီ file မှာတင်ပြင်နိုင်ပါတယ်။
  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight mb-6">Recent Tickets</h2>

      <div className="rounded-2xl bg-white border border-black/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-black/5">
            <tr>
              <th className="px-6 py-4 text-left font-medium text-black/60">Ticket</th>
              <th className="px-6 py-4 text-left font-medium text-black/60">Department</th>
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

                <td className="px-6 py-4 capitalize">{ticket.priority}</td>

                <td className="px-6 py-4 capitalize text-black/60">{ticket.status}</td>

                <td className="px-6 py-4 text-black/60">{ticket.created}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
