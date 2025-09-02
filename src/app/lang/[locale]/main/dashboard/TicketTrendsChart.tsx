"use client";

import React, { useEffect, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { getTicketChartData, TicketTrendsData } from "./action";
import { Role } from "@prisma/client";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

Chart.register(...registerables);

interface TicketTrendsChartProps {
  role: Role;
  userId?: string;
}

const TicketTrendsChart: React.FC<TicketTrendsChartProps> = ({ role, userId }) => {
  const trendsRef = useRef<HTMLCanvasElement>(null);
  const trendsChartRef = useRef<Chart | null>(null);

  const [days, setDays] = useState<number>(7);
  const [trendsData, setTrendsData] = useState<TicketTrendsData | null>(null);

  const { theme } = useTheme(); // "light" or "dark"
  const t = useTranslations("charts");

  useEffect(() => {
    async function fetchData() {
      const data = await getTicketChartData(days, role, userId);
      setTrendsData(data.trends);
    }
    fetchData();
  }, [days, role, userId]);

  useEffect(() => {
    if (!trendsData) return;

    trendsChartRef.current?.destroy();

    if (trendsRef.current) {
      trendsChartRef.current = new Chart(trendsRef.current.getContext("2d")!, {
        type: "line",
        data: {
          labels: trendsData.labels,
          datasets: [
            {
              label: "Open",
              data: trendsData.created,
              borderColor: "#3B82F6",
              backgroundColor: "rgba(59, 130, 246, 0.1)",
              tension: 0.4,
            },
            {
              label: "Closed",
              data: trendsData.resolved,
              borderColor: "#10B981",
              backgroundColor: "rgba(16, 185, 129, 0.1)",
              tension: 0.4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              ticks: { color: theme === "dark" ? "#E5E7EB" : "#374151" },
              grid: { color: theme === "dark" ? "#374151" : "#E5E7EB" },
            },
            y: {
              ticks: { color: theme === "dark" ? "#E5E7EB" : "#374151" },
              grid: { color: theme === "dark" ? "#374151" : "#E5E7EB" },
            },
          },
          plugins: {
            legend: {
              labels: {
                color: theme === "dark" ? "#E5E7EB" : "#374151",
              },
            },
          },
        },
      });
    }
  }, [trendsData, theme]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{t("ticketTrends")}</h3>
        <div className="relative min-w-[150px] z-20 bg-transparent">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="z-20 h-9 w-full appearance-none rounded-lg pr-8 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-1.5 text-sm text-gray-800 dark:text-gray-100 shadow-theme-xs placeholder:text-gray-400 dark:placeholder:text-gray-300 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300/50"
          >
            <option value={7} className="text-gray-500 dark:text-gray-300">{t("timeFilters.last7")}</option>
            <option value={30} className="text-gray-500 dark:text-gray-300">{t("timeFilters.last30")}</option>
            <option value={90} className="text-gray-500 dark:text-gray-300">{t("timeFilters.last90")}</option>
          </select>
          <ChevronDownIcon className="absolute z-30 h-5 w-5 text-gray-500 dark:text-gray-300 right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>
      <div className="h-64">
        <canvas ref={trendsRef}></canvas>
      </div>
    </div>
  );
};

export default TicketTrendsChart;
