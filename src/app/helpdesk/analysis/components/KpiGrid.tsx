"use client";

import { useRouter } from "next/navigation";
import type { AnalysisKpi } from "../action";

type KpiGridProps = {
  kpi: AnalysisKpi;
};

export default function KpiGrid({ kpi }: KpiGridProps) {
  const router = useRouter();

  // KPI card definition ကို data array တစ်ခုထဲထားလို့ order/label/value mapping ကိုကြည့်ရလွယ်ပြီး
  // card အသစ်ထည့်ချင်ရင် item တစ်ကြောင်းသာတိုးရုံနဲ့ရပါတယ်။
  const items: Array<{
    label: string;
    value: number;
    query: Record<string, string>;
  }> = [
    { label: "Total Tickets", value: kpi.totalTickets, query: {} },
    { label: "Open Tickets", value: kpi.openTickets, query: { status: "NEW,OPEN" } },
    {
      label: "Closed Tickets",
      value: kpi.closedTickets,
      query: { status: "RESOLVED,CLOSED,CANCELED" },
    },
    {
      label: "High Priority",
      value: kpi.highPriorityTickets,
      query: { priority: "MAJOR,CRITICAL" },
    },
  ];

  const handleCardClick = (query: Record<string, string>) => {
    const params = new URLSearchParams(query);
    const search = params.toString();
    router.push(search ? `/helpdesk/tickets?${search}` : "/helpdesk/tickets");
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {items.map((item) => (
        <button
          type="button"
          key={item.label}
          onClick={() => handleCardClick(item.query)}
          className="rounded-2xl bg-white border border-black/5 p-6 text-left hover:shadow-md transition-shadow duration-200 cursor-pointer"
        >
          <p className="text-sm text-black/50">{item.label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight">
            {item.value}
          </p>
        </button>
      ))}
    </div>
  );
}
