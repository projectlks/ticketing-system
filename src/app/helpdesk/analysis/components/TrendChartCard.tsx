"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Chart, ChartConfiguration, registerables } from "chart.js";
import type { AnalysisTicketData } from "../action";

Chart.register(...registerables);

const colors = ["#3b82f6", "#10b981", "#f59e0b"];

type TrendChartCardProps = {
  ticketData: AnalysisTicketData[];
};

export default function TrendChartCard({ ticketData }: TrendChartCardProps) {
  const [activeChart, setActiveChart] = useState<"bar" | "line" | "pie">("bar");
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  // Department/status list တွေကို memo လုပ်ထားလို့ chart re-render cost လျှော့နိုင်ပါတယ်။
  const statuses = useMemo(
    () => Array.from(new Set(ticketData.flatMap((d) => Object.keys(d.tickets)))),
    [ticketData],
  );
  const departments = useMemo(
    () => ticketData.map((d) => d.department),
    [ticketData],
  );

  // Chart type သို့ data ပြောင်းတိုင်း instance အဟောင်းကို destroy လုပ်ပြီးအသစ် render လုပ်ပါတယ်။
  useEffect(() => {
    if (!chartRef.current) return;

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    let chartConfig: ChartConfiguration;

    if (activeChart === "bar") {
      chartConfig = {
        type: "bar",
        data: {
          labels: departments,
          datasets: statuses.map((status, index) => ({
            label: status,
            data: ticketData.map((d) => d.tickets[status] || 0),
            backgroundColor: colors[index % colors.length],
            borderRadius: 6,
            borderSkipped: false,
          })),
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "top" as const,
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
          },
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
            data: ticketData.map((d) => d.tickets[status] || 0),
            borderColor: colors[index % colors.length],
            backgroundColor: `${colors[index % colors.length]}1a`,
            tension: 0.4,
            fill: true,
            pointRadius: 5,
            pointBackgroundColor: colors[index % colors.length],
          })),
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "top" as const,
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
          },
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
                ticketData.reduce((sum, dept) => sum + (dept.tickets[status] || 0), 0),
              ),
              backgroundColor: colors,
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
              position: "bottom" as const,
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
      };
    }

    chartInstance.current = new Chart(ctx, chartConfig);

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [activeChart, departments, statuses, ticketData]);

  return (
    <div className="lg:col-span-2 rounded-2xl bg-white border border-black/5 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold tracking-tight">Ticket Trends</h2>

        <div className="flex gap-2">
          {(["bar", "line", "pie"] as const).map((chart) => (
            <button
              key={chart}
              onClick={() => setActiveChart(chart)}
              className={`h-9 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeChart === chart ? "bg-black text-white" : "bg-black/5 hover:bg-black/10"
              }`}
            >
              {chart.charAt(0).toUpperCase() + chart.slice(1)}
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
