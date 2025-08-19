"use client";

import React, { useEffect, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { getTicketChartData, PriorityData } from "./action";
import { Role } from "@prisma/client";

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

  useEffect(() => {
    async function fetchData() {
      const data = await getTicketChartData(days, role, userId);
      setPriorityData(data.priority);
    }
    fetchData();
  }, [days, role, userId]);

  useEffect(() => {
    if (!priorityData) return;

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
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: "bottom" } },
        },
      });
    }
  }, [priorityData]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Priority Distribution</h3>
        <div className="relative w-[150px] z-20 bg-transparent">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="z-20 h-9 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-1.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300/50"
          >
            <option value={7} className="text-gray-500">Last 7 days</option>
            <option value={30} className="text-gray-500">Last 30 days</option>
            <option value={90} className="text-gray-500">Last 90 days</option>
          </select>
          <ChevronDownIcon className="absolute z-30 h-5 w-5 text-gray-500 right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>
      <div className="h-64">
        <canvas ref={priorityRef}></canvas>
      </div>
    </div>
  );
};

export default PriorityChart;
