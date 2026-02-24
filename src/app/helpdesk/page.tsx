"use client";

import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";

import DepartmentCard from "@/components/DepartmentCard";
import { DepartmentTicketStats } from "./department/page";
import { getDepartments } from "./department/action";
import { getMyTickets } from "./tickets/action";
import Link from "next/link";

export default function Page() {
  const [searchQuery, setSearchQuery] = useState("");
  const [department, setDepartment] = useState<DepartmentTicketStats[]>([]);

  const [ticketStats, setTicketStats] = useState({
    request: 0,
    minor: 0,
    major: 0,
    critical: 0,
    closedCount: 0,
    slaSuccess: 0,
    slaFail: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        // Department + My Ticket KPI ကို parallel fetch လုပ်ပြီး overview render ကိုမြန်အောင်ထားပါတယ်။
        const [data, stats] = await Promise.all([
          getDepartments(),
          getMyTickets(),
        ]);
        setDepartment(data);
        setTicketStats(stats);
      } catch (error) {
        setErrorMessage("Failed to load overview data. Please refresh.");
        console.error("Failed to load data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);
  const priorityStats = [
    {
      label: "REQUEST",
      value: ticketStats.request,
      status: "REQUEST",
      className:
        "bg-gray-100 border-gray-300 bg-linear-to-br from-gray-100 via-blue-100 via-80% to-blue-200",
    },
    {
      label: "MINOR",
      value: ticketStats.minor,
      status: "MINOR",
      className:
        "bg-gray-100 border-gray-300 bg-linear-to-br from-gray-100 via-yellow-100 via-80% to-yellow-200",
    },
    {
      label: "MAJOR",
      value: ticketStats.major,
      status: "MAJOR",
      className:
        "bg-gray-100 border-gray-300 bg-linear-to-br from-gray-100 via-orange-100 via-80% to-orange-200",
    },
    {
      label: "CRITICAL",
      value: ticketStats.critical,
      status: "CRITICAL",
      className:
        "bg-gray-100 border-gray-300 bg-linear-to-br from-gray-100 via-red-100 via-80% to-red-200",
    },
  ];

  return (
    <div className="  mx-auto">
      <div className="flex justify-between bg-white px-4 items-center border-b border-gray-300 py-4">
        <p>Helpdesk Overview</p>

        {/* Search input */}

        <div
          className={`relative min-w-[40%] flex flex-wrap items-center border border-gray-300 rounded min-h-[34px] `}>
          {/* Search input */}
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute top-1/2 left-3 w-4 h-4 text-gray-700 transform -translate-y-1/2 pointer-events-none" />

            <input
              type="text"
              placeholder={"Search"}
              className="h-6 w-full flex-1  pl-9 pr-10 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div></div>
      </div>

      {/* 
  
  
  
   */}
      <section className="px-4 py-8 border-b flex space-x-10 border-gray-300 bg-white ">
        {/* left */}
        <div className="w-1/2 ">
          <div className=" items-center  grid grid-cols-5 space-x-2">
            <span className="block  w-full  ">
              <h1 className="font-bold text-[20px] ">My Tickets</h1>

              <p className="text-xs text-gray-500">Open Tickets</p>
            </span>

            {priorityStats.map((item, idx) => (
              <Link
                key={idx}
                // My Tickets card ကနေသွားတဲ့ link ကို Assigned To Me + priority နဲ့ချိတ်ထားလို့ count နဲ့ list တူညီလာပါတယ်။
                href={`/helpdesk/tickets?ownership=Assigned To Me&priority=${item.status}&status=OPEN,IN_PROGRESS,NEW  `}
                className={`flex items-center rounded py-4 border justify-center flex-col ${item.className}`}>
                <h1 className="text-[20px]">{item.value}</h1>
                <p className="text-xs">{item.label}</p>
              </Link>
            ))}
            {/* </div> */}
          </div>
        </div>

        {/* right */}

        <div className="w-1/2 ">
          <div className=" items-center  grid grid-cols-4 space-x-2">
            <span className="block  w-full  ">
              <h1 className="font-bold text-[20px] ">My Performance</h1>

              <p className="text-xs text-gray-500">Today</p>
            </span>

            <span className="flex items-center bg-gray-100 rounded py-4 border border-gray-300  justify-center flex-col">
              <h1 className="text-[20px] ">{ticketStats.closedCount}</h1>
              <p className="text-xs">Closed Tickets</p>
            </span>

            <span className="flex items-center bg-gray-100 rounded py-4 border border-gray-300 bg-linear-to-br from-gray-100 via-green-100 via-80% to-green-200 justify-center flex-col">
              <h1 className="text-[20px] ">{ticketStats.slaSuccess}</h1>
              <p className="text-xs">SLA Success</p>
            </span>

            <span className="flex items-center bg-gray-100 rounded py-4 border border-gray-300 bg-linear-to-br from-gray-100 via-red-100 via-80% to-red-200 justify-center flex-col">
              <h1 className="text-[20px] ">{ticketStats.slaFail}</h1>
              <p className="text-xs">SLA fail</p>
            </span>
          </div>
        </div>
      </section>

      <section className=" w-full  grid-cols-4 grid gap-4 p-4 ">
        {isLoading && (
          <p className="text-sm text-gray-500">Loading overview data...</p>
        )}
        {!isLoading && errorMessage && (
          <p className="text-sm text-red-500">{errorMessage}</p>
        )}

        {!isLoading &&
          !errorMessage &&
          department
            .filter((d) =>
              d.name.toLowerCase().includes(searchQuery.toLowerCase()),
            )
            .map((dept, index) => {
              return <DepartmentCard dept={dept} key={index} />;
            })}
      </section>
    </div>
  );
}
