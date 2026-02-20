"use client";

import React, { useEffect, useRef, useState } from "react";
import { Chart, ChartConfiguration, registerables } from "chart.js";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";


// Chart instance မတည်ဆောက်ခင် registerables ကို register လုပ်ထားမှ chart type တွေကို safely render နိုင်တယ်
Chart.register(...registerables);

type TicketData = {
  department: string;
  tickets: Record<string, number>;
};

type Ticket = {
  id: string;
  title: string;
  department: string;
  priority: "high" | "medium" | "low";
  status: "open" | "closed" | "pending";
  created: string;
};

export default function Dashboard() {
  const [activeChart, setActiveChart] = useState<"bar" | "line" | "pie">("bar");
  const chartRef = useRef<HTMLCanvasElement>(null);
  const doughnutRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const doughnutInstance = useRef<Chart | null>(null);

  // Dashboard preview အတွက် mock dataset (backend API ချိတ်တဲ့အခါ ဒီ data source ကို replace လုပ်နိုင်)
  const ticketData: TicketData[] = [
    { department: "IT", tickets: { Open: 12, Closed: 28, Pending: 4 } },
    { department: "HR", tickets: { Open: 7, Closed: 35, Pending: 3 } },
    { department: "Finance", tickets: { Open: 10, Closed: 22, Pending: 2 } },
    { department: "Operations", tickets: { Open: 15, Closed: 40, Pending: 5 } },
  ];

  // Table/KPI preview အတွက် recent ticket sample data
  const recentTickets: Ticket[] = [
    {
      id: "TKT-2024-001",
      title: "Server downtime issue",
      department: "IT",
      priority: "high",
      status: "open",
      created: "2 hours ago",
    },
    {
      id: "TKT-2024-002",
      title: "Password reset request",
      department: "HR",
      priority: "low",
      status: "pending",
      created: "4 hours ago",
    },
    {
      id: "TKT-2024-003",
      title: "Budget approval needed",
      department: "Finance",
      priority: "high",
      status: "open",
      created: "1 day ago",
    },
    {
      id: "TKT-2024-004",
      title: "Inventory check",
      department: "Operations",
      priority: "medium",
      status: "closed",
      created: "2 days ago",
    },
    {
      id: "TKT-2024-005",
      title: "Database optimization",
      department: "IT",
      priority: "medium",
      status: "pending",
      created: "3 days ago",
    },
  ];

  // Department ticket object တွေကနေ status key (Open/Closed/Pending) ကို dynamic စုထုတ်
  const statuses = Array.from(
    new Set(ticketData.flatMap((d) => Object.keys(d.tickets))),
  );
  const colors = ["#3b82f6", "#10b981", "#f59e0b"];

  // KPI card တွေနဲ့ chart summary တူညီတဲ့ source ကနေလာအောင် aggregate တွက်ချက်
  const totalTickets = ticketData.reduce(
    (sum, dept) => sum + Object.values(dept.tickets).reduce((a, b) => a + b, 0),
    0,
  );

  const openTickets = ticketData.reduce(
    (sum, dept) => sum + (dept.tickets.Open || 0),
    0,
  );

  const closedTickets = ticketData.reduce(
    (sum, dept) => sum + (dept.tickets.Closed || 0),
    0,
  );

  const highPriorityTickets = recentTickets.filter(
    (t) => t.priority === "high",
  ).length;

  const priorityBreakdown = {
    high: recentTickets.filter((t) => t.priority === "high").length,
    medium: recentTickets.filter((t) => t.priority === "medium").length,
    low: recentTickets.filter((t) => t.priority === "low").length,
  };

  const departments = ticketData.map((d) => d.department);

  useEffect(() => {
    // Chart type ပြောင်းတိုင်း chart instance အဟောင်းကိုဖျက်ပြီး config အသစ်နဲ့ပြန်တည်ဆောက်
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
              stacked: activeChart === "bar",
              grid: { color: "#e5e7eb" },
              ticks: { color: "#6b7280" },
            },
            y: {
              stacked: activeChart === "bar",
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
            backgroundColor: colors[index % colors.length] + "1a",
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
                ticketData.reduce(
                  (sum, dept) => sum + (dept.tickets[status] || 0),
                  0,
                ),
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
  }, [activeChart]);

  useEffect(() => {
    // Priority doughnut chart ကိုသီးသန့် canvas မှာ render (cleanup ဖြင့် memory leak ကာကွယ်)
    if (!doughnutRef.current) return;

    const ctx = doughnutRef.current.getContext("2d");
    if (!ctx) return;

    if (doughnutInstance.current) {
      doughnutInstance.current.destroy();
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
    });

    return () => {
      if (doughnutInstance.current) {
        doughnutInstance.current.destroy();
      }
    };
  }, []);

  // testiung

  // --- States ---
  // UI filter/search state တွေ (header controls နဲ့ချိတ်ထားတဲ့ local state)
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [department, setDepartment] = useState<[]>([]);
  const [ticketStats, setTicketStats] = useState({
    request: 0,
    minor: 0,
    major: 0,
    critical: 0,
    closedCount: 0,
    slaSuccess: 0,
    slaFail: 0,
  });

  // --- Priority Stats ---
  const priorityStats = [
    {
      label: "REQUEST",
      value: ticketStats.request,
      color: "blue",
      status: "REQUEST",
    },
    {
      label: "MINOR",
      value: ticketStats.minor,
      color: "yellow",
      status: "MINOR",
    },
    {
      label: "MAJOR",
      value: ticketStats.major,
      color: "orange",
      status: "MAJOR",
    },
    {
      label: "CRITICAL",
      value: ticketStats.critical,
      color: "red",
      status: "CRITICAL",
    },
  ];

  // --- Fetch Data ---
  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       const data = await getDepartments({ fromDate, toDate });
  //       setDepartment(data);

  //       const stats = await getMyTickets({ fromDate, toDate });
  //       setTicketStats(stats);
  //     } catch (error) {
  //       console.error("Failed to load data:", error);
  //     }
  //   };

  //   fetchData();
  // }, [fromDate, toDate]);

  // --- Handle Download ---
  const handleDownload = () => {
    // Date filter parameters ကို query string အဖြစ်ပို့ပြီး export endpoint ကို tab အသစ်နဲ့ခေါ်
    const query = new URLSearchParams({ fromDate, toDate }).toString();
    window.open(`/api/helpdesk/export?${query}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#111]">
      {/* Header */}
      {/* <header className="sticky top-0 z-20 bg-white/70 backdrop-blur-md border-b border-black/5">
      <div className="max-w-7xl mx-auto px-6 py-5">
        <h1 className="text-2xl font-semibold tracking-tight">
          Ticket Dashboard
        </h1>
        <p className="text-sm text-black/60 mt-1">
          Real-time monitoring and analysis
        </p>
      </div>
    </header> */}

      <header className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white px-6 py-4 border-b border-gray-200">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">
          Helpdesk Overview
        </h1>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Date Filters */}
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border rounded px-2 py-1 text-sm w-32"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border rounded px-2 py-1 text-sm w-32"
          />

          {/* Search */}
          <div className="relative flex-1 md:flex-none">
            <MagnifyingGlassIcon className="absolute top-1/2 left-3 w-4 h-4 text-gray-400 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search"
              className="pl-9 pr-3 py-1 border rounded text-sm w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            className="px-4 py-1.5 bg-black text-white text-sm rounded hover:bg-gray-800">
            Download
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: "Total Tickets", value: totalTickets },
            { label: "Open Tickets", value: openTickets },
            { label: "Closed Tickets", value: closedTickets },
            { label: "High Priority", value: highPriorityTickets },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl bg-white border border-black/5 p-6 hover:shadow-md transition-shadow duration-200">
              <p className="text-sm text-black/50">{item.label}</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chart */}
          <div className="lg:col-span-2 rounded-2xl bg-white border border-black/5 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold tracking-tight">
                Ticket Trends
              </h2>

              <div className="flex gap-2">
                {(["bar", "line", "pie"] as const).map((chart) => (
                  <button
                    key={chart}
                    onClick={() => setActiveChart(chart)}
                    className={`h-9 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                      activeChart === chart
                        ? "bg-black text-white"
                        : "bg-black/5 hover:bg-black/10"
                    }`}>
                    {chart.charAt(0).toUpperCase() + chart.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-80">
              <canvas ref={chartRef}></canvas>
            </div>
          </div>

          {/* Priority Chart */}
          <div className="rounded-2xl bg-white border border-black/5 p-6">
            <h2 className="text-lg font-semibold tracking-tight mb-6">
              Priority Distribution
            </h2>
            <div className="h-80">
              <canvas ref={doughnutRef}></canvas>
            </div>
          </div>
        </div>

        {/* Department Performance */}
        <div>
          <h2 className="text-lg font-semibold tracking-tight mb-6">
            Department Performance
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {ticketData.map((dept) => {
              const total = Object.values(dept.tickets).reduce(
                (a, b) => a + b,
                0,
              );
              const closed = dept.tickets.Closed || 0;
              const closureRate =
                total > 0 ? ((closed / total) * 100).toFixed(0) : 0;

              return (
                <div
                  key={dept.department}
                  className="rounded-2xl bg-white border border-black/5 p-6 hover:shadow-md transition-shadow">
                  <h3 className="font-semibold tracking-tight">
                    {dept.department}
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
                          style={{ width: `${closureRate}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Tickets */}
        <div>
          <h2 className="text-lg font-semibold tracking-tight mb-6">
            Recent Tickets
          </h2>

          <div className="rounded-2xl bg-white border border-black/5 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-black/5">
                <tr>
                  <th className="px-6 py-4 text-left font-medium text-black/60">
                    Ticket
                  </th>
                  <th className="px-6 py-4 text-left font-medium text-black/60">
                    Department
                  </th>
                  <th className="px-6 py-4 text-left font-medium text-black/60">
                    Priority
                  </th>
                  <th className="px-6 py-4 text-left font-medium text-black/60">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {recentTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="border-t border-black/5 hover:bg-black/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium">{ticket.title}</div>
                      <div className="text-xs text-black/50">{ticket.id}</div>
                    </td>

                    <td className="px-6 py-4 text-black/60">
                      {ticket.department}
                    </td>

                    <td className="px-6 py-4 capitalize">{ticket.priority}</td>

                    <td className="px-6 py-4 capitalize text-black/60">
                      {ticket.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
