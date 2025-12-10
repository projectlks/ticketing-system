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

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch departments
                const data = await getDepartments();
                setDepartment(data);

                // Fetch my tickets stats
                const stats = await getMyTickets();
                setTicketStats(stats);
                // const performance = await getMyTodayTickets();

            } catch (error) {
                console.error("Failed to load data:", error);
            }
        };

        fetchData();
    }, []);
    const priorityStats = [
        { label: "REQUEST", value: ticketStats.request, color: "blue", status: "REQUEST" },
        { label: "MINOR", value: ticketStats.minor, color: "yellow", status: "MINOR" },
        { label: "MAJOR", value: ticketStats.major, color: "orange", status: "MAJOR" },
        { label: "CRITICAL", value: ticketStats.critical, color: "red", status: "CRITICAL" },
    ];




    return (
        <>




            <div className="flex justify-between bg-white px-4 items-center border-b border-gray-300 py-4">
                <p>
                    Helpdesk Overview
                </p>

                {/* Search input */}

                <div
                    className={`relative min-w-[40%] flex flex-wrap items-center border border-gray-300 rounded min-h-[34px] `}
                >

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

                <div>

                </div>
            </div>
            {/* 
  
  
  
   */}
            <section className="px-4 py-8 border-b flex space-x-10 border-gray-300 bg-white ">
                {/* left */}
                <div className="w-1/2 ">


                    <div className=" items-center  grid grid-cols-5 space-x-2">
                        <span className="block  w-full  ">

                            <h1 className="font-bold text-[20px] ">
                                My Tickets
                            </h1>

                            <p className="text-xs text-gray-500">
                                Open Tickets
                            </p>

                        </span>

                        {/* <span className="flex items-center bg-gray-100 rounded py-4 border border-gray-300 bg-linear-to-br from-gray-100 via-blue-100 via-80% to-blue-200 justify-center flex-col">
                            <h1 className="text-[20px] ">{ticketStats.request}</h1>
                            <p className="text-xs">REQUEST</p>
                        </span>

                        <span className="flex items-center bg-gray-100 rounded py-4 border border-gray-300 bg-linear-to-br from-gray-100 via-yellow-100 via-80% to-yellow-200 justify-center flex-col">
                            <h1 className="text-[20px] ">{ticketStats.minor}</h1>
                            <p className="text-xs">MINOR</p>
                        </span>



                        <span className="flex items-center bg-gray-100 rounded py-4 border border-gray-300 bg-linear-to-br from-gray-100 via-orange-100 via-80% to-orange-200 justify-center flex-col">

                            <h1 className="text-[20px]">{ticketStats.major}</h1>
                            <p className="text-xs">MAJOR</p>
                        </span>


                        <span className="flex items-center bg-gray-100 rounded py-4 border border-gray-300 bg-linear-to-br from-gray-100 via-red-100 via-80% to-red-200 justify-center flex-col">

                            <h1 className="text-[20px] ">{ticketStats.critical}</h1>
                            <p className="text-xs">CRITICAL</p>
                        </span>
 */}

                        {/* <div className="grid grid-cols-5 gap-4"> */}
                            {priorityStats.map((item, idx) => (
                                <Link
                                    key={idx}
                                    href={`/helpdesk/tickets?priority=${item.status}`}
                                    className={`flex items-center rounded py-4 border justify-center flex-col bg-gray-100 border-gray-300 bg-linear-to-br from-gray-100 via-${item.color}-100 via-80% to-${item.color}-200`}
                                >
                                    <h1 className="text-[20px]">{item.value}</h1>
                                    <p className="text-xs">{item.label}</p>
                                </Link>
                            ))}
                        {/* </div> */}


                    </div>

                </div>


                {/* right */}

                <div className="w-1/2 " >


                    <div className=" items-center  grid grid-cols-4 space-x-2">
                        <span className="block  w-full  ">

                            <h1 className="font-bold text-[20px] ">
                                My Performance
                            </h1>

                            <p className="text-xs text-gray-500">
                                Today
                            </p>

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

                {
                    department.filter(d =>
                        d.name.toLowerCase().includes(searchQuery.toLowerCase())
                    ).map((dept, index) => {
                        return (


                            <DepartmentCard dept={dept} key={index} />

                        )
                    })

                }



            </section>






        </>


    )
}
