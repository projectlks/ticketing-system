"use client";

import React, { useEffect, useRef, useState } from "react";
import {
    ChartBarIcon,
    PresentationChartLineIcon,
    ChartPieIcon,
} from "@heroicons/react/24/outline";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

type TicketData = {
    department: string;
    tickets: Record<string, number>; // ✅ supports dynamic keys like Open, Closed, etc.
};

export default function Page() {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<Chart | null>(null);

    // chart type toggle
    const [chartType, setChartType] = useState<"bar" | "line" | "pie" | "doughnut">("bar");

    // example data (could be fetched from API)
    const ticketData: TicketData[] = [
        { department: "IT", tickets: { Open: 12, Closed: 8, Pending: 4 } },
        { department: "HR", tickets: { Open: 7, Closed: 15, Pending: 3 } },
        { department: "Finance", tickets: { Open: 10, Closed: 5, Pending: 2 } },
    ];

    // dynamically detect statuses (Open, Closed, Pending, etc.)
    const statuses = Array.from(
        new Set(ticketData.flatMap((d) => Object.keys(d.tickets)))
    );

    // helper for colors
    const colors = ["#3b82f6", "#22c55e", "#facc15", "#ef4444", "#a855f7"];



    // build datasets dynamically
    const datasets = statuses.map((status, i) => ({
        label: status,
        data: ticketData.map((d) => d.tickets[status] || 0),

        borderColor: chartType === "line" ? colors[i % colors.length] : "#ffffff",
        backgroundColor:
            chartType === "line"
                ? colors[i % colors.length] + "33" // semi-transparent for area fill
                : colors[i % colors.length],
        fill: chartType === "line", // ✅ fill area under line
        tension: 0.3, // smooth curve
        borderWidth: 2,

    }));

    useEffect(() => {
        if (!chartRef.current) return;

        // destroy old chart if exists
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        // create chart
        chartInstance.current = new Chart(chartRef.current, {
            type: chartType,
            // data: {
            //     labels: ticketData.map((d) => d.department),
            //     datasets,
            // },

            data:
                chartType === "pie" || chartType === "doughnut"
                    ? {
                        labels: ticketData.map((d) => d.department), // departments only
                        datasets: statuses.map((status) => ({
                            label: status,
                            data: ticketData.map((d) => d.tickets[status] || 0),
                            backgroundColor: colors.map((c) => c + "cc"), // separate color per department
                            borderColor: "#fff",
                            borderWidth: 2,
                        })),
                    }
                    : {
                        // ✅ bar/line use departments
                        labels: ticketData.map((d) => d.department),
                        datasets,
                    },





            options: {
                responsive: true,
                maintainAspectRatio: chartType !== "pie",
                plugins: {
                    legend: { position: "bottom" },
                    title: {
                        display: true,
                        text: `Tickets by Department (${chartType.toUpperCase()})`,
                    },
                },
                scales:
                    chartType !== "pie"
                        ? {
                            x: { stacked: chartType === "bar" },
                            y: {
                                beginAtZero: true,
                                stacked: chartType === "bar",
                                title: { display: true, text: "Number of Tickets" },
                            },
                        }
                        : {},
            },
        });
    }, [chartType]);

    return (
        <section className="p-4">
            {/* Chart Type Buttons */}
            <div className="flex items-center space-x-2 mb-4">
                <button
                    onClick={() => setChartType("bar")}
                    className={`flex items-center justify-center h-8 rounded aspect-square transition ${chartType === "bar"
                        ? "bg-gray-800 text-white"
                        : "bg-gray-200 hover:bg-gray-300"
                        }`}
                >
                    <ChartBarIcon className="size-4" />
                </button>

                <button
                    onClick={() => setChartType("line")}
                    className={`flex items-center justify-center h-8 rounded aspect-square transition ${chartType === "line"
                        ? "bg-gray-800 text-white"
                        : "bg-gray-200 hover:bg-gray-300"
                        }`}
                >
                    <PresentationChartLineIcon className="size-4" />
                </button>

                <button
                    onClick={() => setChartType("pie")}
                    className={`flex items-center justify-center h-8 rounded aspect-square transition ${chartType === "pie"
                        ? "bg-gray-800 text-white"
                        : "bg-gray-200 hover:bg-gray-300"
                        }`}
                >
                    <ChartPieIcon className="size-4" />
                </button>
            </div>

            {/* Chart Canvas */}
            <div className={`flex justify-center mx-auto bg-white  p-2 rounded shadow-sm ${chartType === "pie" ? "h-[80vh] " : ""} `}>
                <canvas ref={chartRef}></canvas>
            </div>
        </section>
    );
}
