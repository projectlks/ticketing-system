"use client";

import type { AnalysisKpi } from "../action";

type KpiGridProps = {
  kpi: AnalysisKpi;
};

export default function KpiGrid({ kpi }: KpiGridProps) {
  // KPI card definition ကို data array တစ်ခုထဲထားလို့ order/label/value mapping ကိုကြည့်ရလွယ်ပြီး
  // card အသစ်ထည့်ချင်ရင် item တစ်ကြောင်းသာတိုးရုံနဲ့ရပါတယ်။
  const items = [
    { label: "Total Tickets", value: kpi.totalTickets },
    { label: "Open Tickets", value: kpi.openTickets },
    { label: "Closed Tickets", value: kpi.closedTickets },
    { label: "High Priority", value: kpi.highPriorityTickets },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl bg-white border border-black/5 p-6 hover:shadow-md transition-shadow duration-200"
        >
          <p className="text-sm text-black/50">{item.label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
