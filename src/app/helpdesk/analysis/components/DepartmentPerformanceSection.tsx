"use client";

import type { AnalysisTicketData } from "../action";

type DepartmentPerformanceSectionProps = {
  ticketData: AnalysisTicketData[];
};

export default function DepartmentPerformanceSection({
  ticketData,
}: DepartmentPerformanceSectionProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight mb-6">
        Department Performance
      </h2>

      {ticketData.length === 0 ? (
        <div className="rounded-2xl bg-white border border-black/5 p-8 text-sm text-black/60">
          No department data for this date range.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {ticketData.map((department) => {
            // Department တစ်ခုချင်းစီအတွက် total ticket နှင့် closure rate ကို local compute လုပ်ထားပါတယ်။
            const total = Object.values(department.tickets).reduce(
              (sum, count) => sum + count,
              0,
            );
            const closed = department.tickets.Closed || 0;
            const closureRate = total > 0 ? Math.round((closed / total) * 100) : 0;

            return (
              <div
                key={department.department}
                className="rounded-2xl bg-white border border-black/5 p-6 hover:shadow-md transition-shadow"
              >
                <h3 className="font-semibold tracking-tight">
                  {department.department}
                </h3>

                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-black/50">Total</span>
                    <span className="font-medium">{total}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-black/50">Closed</span>
                    <span className="font-medium">{closed}</span>
                  </div>

                  <div className="pt-3">
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-black/50">Closure Rate</span>
                      <span className="font-medium">{closureRate}%</span>
                    </div>

                    <div className="h-2 bg-black/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-black transition-all duration-500"
                        style={{ width: `${closureRate}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
