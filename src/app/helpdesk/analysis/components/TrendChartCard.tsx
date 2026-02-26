"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Chart, type ChartConfiguration, registerables } from "chart.js";
import type { AnalysisTicketData } from "../action";

Chart.register(...registerables);

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

type ChartMode = "bar" | "line" | "pie";

type TrendChartCardProps = {
  ticketData: AnalysisTicketData[];
};

const buildSharedPluginOptions = (legendPosition: "top" | "bottom") => ({
  legend: {
    position: legendPosition,
    labels: {
      color: "#1a1a1a",
      font: { size: 12 },
      padding: 12,
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
});

export default function TrendChartCard({ ticketData }: TrendChartCardProps) {
  const [activeChart, setActiveChart] = useState<ChartMode>("bar");
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  // ticketData ထဲက status key များကို dedupe လုပ်ပြီး chart dataset order ကိုတည်ငြိမ်စေပါတယ်။
  const statuses = useMemo(
    () => Array.from(new Set(ticketData.flatMap((item) => Object.keys(item.tickets)))),
    [ticketData],
  );

  // Department label list ကို memo လုပ်ထားလို့ unrelated state ပြောင်းချိန်များတွင် ပြန်မတွက်ရပါ။
  const departments = useMemo(
    () => ticketData.map((item) => item.department),
    [ticketData],
  );

  useEffect(() => {
    if (!chartRef.current) return;

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    // Chart.js instance ကို recreate မလုပ်မီ destroy လုပ်ထားလို့ memory leak မဖြစ်စေပါ။
    if (chartInstance.current) {
      chartInstance.current.destroy();
      chartInstance.current = null;
    }

    let chartConfig: ChartConfiguration;

    if (activeChart === "bar") {
      chartConfig = {
        type: "bar",
        data: {
          labels: departments,
          datasets: statuses.map((status, index) => ({
            label: status,
            data: ticketData.map((item) => item.tickets[status] || 0),
            backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
            borderRadius: 6,
            borderSkipped: false,
          })),
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: buildSharedPluginOptions("top"),
          scales: {
            x: {
              stacked: true,
              grid: { color: "#e5e7eb" },
              ticks: { color: "#6b7280" },
            },
            y: {
              stacked: true,
              beginAtZero: true,
              grid: { color: "#e5e7eb" },
              ticks: { color: "#6b7280" },
            },
          },
        },
      };
    } else if (activeChart === "line") {
      chartConfig = {
        type: "line",
        data: {
          labels: departments,
          datasets: statuses.map((status, index) => ({
            label: status,
            data: ticketData.map((item) => item.tickets[status] || 0),
            borderColor: CHART_COLORS[index % CHART_COLORS.length],
            backgroundColor: `${CHART_COLORS[index % CHART_COLORS.length]}1a`,
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointBackgroundColor: CHART_COLORS[index % CHART_COLORS.length],
          })),
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: buildSharedPluginOptions("top"),
          scales: {
            x: {
              stacked: false,
              grid: { color: "#e5e7eb" },
              ticks: { color: "#6b7280" },
            },
            y: {
              stacked: false,
              beginAtZero: true,
              grid: { color: "#e5e7eb" },
              ticks: { color: "#6b7280" },
            },
          },
        },
      };
    } else {
      chartConfig = {
        type: "pie",
        data: {
          labels: statuses,
          datasets: [
            {
              data: statuses.map((status) =>
                ticketData.reduce(
                  (sum, department) => sum + (department.tickets[status] || 0),
                  0,
                ),
              ),
              backgroundColor: CHART_COLORS,
              borderColor: "#ffffff",
              borderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: buildSharedPluginOptions("bottom"),
        },
      };
    }

    chartInstance.current = new Chart(ctx, chartConfig);

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [activeChart, departments, statuses, ticketData]);

  return (
    <div className="lg:col-span-2 rounded-2xl bg-white border border-black/5 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold tracking-tight">Ticket Trends</h2>

        <div className="flex gap-2">
          {(["bar", "line", "pie"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setActiveChart(mode)}
              className={`h-9 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeChart === mode
                  ? "bg-black text-white"
                  : "bg-black/5 hover:bg-black/10"
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="h-80">
        <canvas ref={chartRef}></canvas>
      </div>
    </div>
  );
}

