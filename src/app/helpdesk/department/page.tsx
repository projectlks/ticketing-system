"use client";
import { useEffect, useState } from "react";
import Button from "@/components/Button";
import "react-resizable/css/styles.css";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { getDepartments } from "./action";
import DepartmentCard from "@/components/DepartmentCard";
export type DepartmentTicketStats = {
    id: string;
    name: string;
    contact: string | null;
    email: string | null;
    count: {
        new: number;
        open: number;
        closed: number;
        urgent: number;
        unassigned: number;
    }
};

export default function DepartmentPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [department, setDepartment] = useState<DepartmentTicketStats[]>([]);
    const router = useRouter();





    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getDepartments();  // <-- fetch from server
                setDepartment(data);                 // <-- update state
            } catch (error) {
                console.error("Failed to load departments:", error);
            }
        };

        fetchData();
    }, []);


    return (
        <div className="p-4">
            {/* Top Bar */}
            <div className="flex justify-between items-center bg-white px-4 py-4 border-b border-gray-300 rounded-t-md">
                <div className="flex items-center space-x-2">
                    <Button click={() => router.push("/helpdesk/department/new")} buttonLabel="NEW" />
                    <h1 className="text-sm text-gray-800 font-medium">Departments</h1>
                </div>




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

                <div >


                </div>
            </div>


            <section className=" w-full  grid-cols-4 grid gap-4 py-4 ">

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

        </div>
    );
}
