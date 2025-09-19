"use client";

import React, { useEffect, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { getTicketChartData, PriorityData } from "./action";
import { Role } from "@prisma/client";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

Chart.register(...registerables);

interface PriorityChartProps {
  role: Role;
  userId?: string;
}

const PriorityChart: React.FC<PriorityChartProps> = ({ role, userId }) => {
  const priorityRef = useRef<HTMLCanvasElement>(null);
  const priorityChartRef = useRef<Chart | null>(null);

  const [days, setDays] = useState<number>(7);
  const [priorityData, setPriorityData] = useState<PriorityData | null>(null);
  const { theme } = useTheme(); // "light" or "dark"

  const t = useTranslations("charts");

  // Fetch chart data
  useEffect(() => {
    async function fetchData() {
      const data = await getTicketChartData(days, role, userId);
      setPriorityData(data.priority);
    }
    fetchData();
  }, [days, role, userId]);

  // Render chart & update on theme or data change
  useEffect(() => {
    if (!priorityData) return;

    // Destroy previous chart if exists
    priorityChartRef.current?.destroy();

    if (priorityRef.current) {
      priorityChartRef.current = new Chart(priorityRef.current.getContext("2d")!, {
        type: "doughnut",
        data: {
          labels: priorityData.labels,
          datasets: [
            {
              data: priorityData.counts,
              backgroundColor: ["#EF4444", "#F59E0B", "#3B82F6", "#10B981"],
              borderColor: theme === "dark" ? "#1F2937" : "#FFFFFF", // dark gray in dark mode, white in light
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
                color: theme === "dark" ? "#E5E7EB" : "#374151", // gray-100 / gray-700
                font: {
                  size: 12,

                },
              },
            },
            tooltip: {
              titleColor: theme === "dark" ? "#E5E7EB" : "#E5E7EB",
              bodyColor: theme === "dark" ? "#E5E7EB" : "#374151",
            },
          },
        },
      });
    }

    // Cleanup on unmount
    return () => {
      priorityChartRef.current?.destroy();
    };
  }, [priorityData, theme]); // ← update whenever theme changes

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          {t("priorityDistribution")}
        </h3>
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
        <canvas ref={priorityRef}></canvas>
      </div>
    </div>
  );
};

export default PriorityChart;
