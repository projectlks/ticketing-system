"use client";

import { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
import type { AnalysisPriorityBreakdown } from "../action";

Chart.register(...registerables);

type PriorityChartCardProps = {
  priorityBreakdown: AnalysisPriorityBreakdown;
};

export default function PriorityChartCard({
  priorityBreakdown,
}: PriorityChartCardProps) {
  const doughnutRef = useRef<HTMLCanvasElement>(null);
  const doughnutInstance = useRef<Chart | null>(null);

  // Breakdown data ပြောင်းတိုင်း doughnut chart instance ကိုပြန်တည်ဆောက်ပြီး
  // အရင် instance ကို destroy လုပ်ထားလို့ stale canvas state မကျန်စေပါ။
  useEffect(() => {
    if (!doughnutRef.current) return;

    const ctx = doughnutRef.current.getContext("2d");
    if (!ctx) return;

    if (doughnutInstance.current) {
      doughnutInstance.current.destroy();
      doughnutInstance.current = null;
    }

    doughnutInstance.current = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["High Priority", "Medium Priority", "Low Priority"],
        datasets: [
          {
            data: [
              priorityBreakdown.high,
              priorityBreakdown.medium,
              priorityBreakdown.low,
            ],
            backgroundColor: ["#ef4444", "#f59e0b", "#10b981"],
            borderColor: "#ffffff",
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "#1a1a1a",
              font: { size: 12 },
              padding: 15,
              usePointStyle: true,
            },
          },
          tooltip: {
            backgroundColor: "#f8f8f8",
            titleColor: "#1a1a1a",
            bodyColor: "#1a1a1a",
            borderColor: "#e5e7eb",
            borderWidth: 1,
          },
        },
      },
    });

    return () => {
      if (doughnutInstance.current) {
        doughnutInstance.current.destroy();
        doughnutInstance.current = null;
      }
    };
  }, [priorityBreakdown.high, priorityBreakdown.medium, priorityBreakdown.low]);

  return (
    <div className="rounded-2xl bg-white border border-black/5 p-6">
      <h2 className="text-lg font-semibold tracking-tight mb-6">
        Priority Distribution
      </h2>
      <div className="h-80">
        <canvas ref={doughnutRef}></canvas>
      </div>
    </div>
  );
}

