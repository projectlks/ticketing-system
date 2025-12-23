"use client";
import { useEffect, useState } from "react";
import Button from "@/components/Button";
import "react-resizable/css/styles.css";
import { EnvelopeIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { getUsers } from "./action";
import Avatar from "@/components/Avatar";
export type TicketStats = {
    id: string;
    name: string;
    email: string;
    assigned: {
        new: number,
        open: number;
        inprogress: number;
        closed: number;
    };
    created: {
        new: number,

        open: number;
        inprogress: number;
        closed: number;
    };
};


export default function DepartmentPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [users, setUsers] = useState<TicketStats[]>([]);
    const router = useRouter();





    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getUsers();  // <-- fetch from server
                setUsers(data);                 // <-- update state
            } catch (error) {
                console.error("Failed to load users:", error);
            }
        };

        fetchData();
    }, []);


    return (
        <div className="p-4">
            {/* Top Bar */}
            <div className="flex justify-between items-center bg-white px-4 py-4 border-b border-gray-300 rounded-t-md">
                <div className="flex items-center space-x-2">
                    <Button click={() => router.push("/helpdesk/user/new")} buttonLabel="NEW" />
                    <h1 className="text-sm text-gray-800 font-medium">Users</h1>
                </div>




                <div
                    className={`relative min-w-[40%] flex flex-wrap items-center border border-gray-300 rounded min-h-[34px] `}
                >

                    {/* Search input */}
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className="absolute top-1/2 left-3 w-4 h-4 text-gray-700 transform -translate-y-1/2 pointer-events-none" />

                        <input
                            type="text"
                            placeholder={"Search by name or email..."}
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
                    users
                        .filter(user => {
                            const query = searchQuery.toLowerCase();
                            return (
                                user.name.toLowerCase().includes(query) ||
                                user.email.toLowerCase().includes(query)
                            );
                        })
                        .map((user, index) => {
                            return (






                                <div key={index} className="w-full h-full bg-white  border-gray-300 border   px-5 py-3  ">


                                    <div className="flex space-x-2 ">


                                        <Avatar name={user.name} />


                                        <div>


                                            <h1 className="font-bold text-[18px] ">
                                                {user.name}
                                            </h1>
                                            <span className="flex items-end text-[12px] -mt-1  text-indigo-500 space-x-1">

                                                <EnvelopeIcon className="w-4 h-4 " />
                                                <p>
                                                    {/* mglinkar08@gmail.com */}
                                                    {user.email}
                                                </p>

                                            </span>
                                        </div>


                                    </div>




                             

                                    {/* ASSIGNED SECTION */}
                                    <p className="mt-8 mb-2 text-xs text-gray-500 font-semibold">
                                        Assigned to this user
                                    </p>

                                    <div className="grid grid-cols-4 text-center  overflow-hidden">
                                        <div className="py-2">
                                            <h1 className="text-indigo-500 font-bold text-[12px]">
                                                {user.assigned.new}
                                            </h1>
                                            <p className="text-xs text-gray-500">new</p>
                                        </div>

                                        <div className="py-2 border-l border-gray-200">
                                            <h1 className="text-indigo-500 font-bold text-[12px]">
                                                {user.assigned.open}
                                            </h1>
                                            <p className="text-xs text-gray-500">open</p>
                                        </div>

                                        <div className="py-2 border-l border-gray-200">
                                            <h1 className="text-indigo-500 font-bold text-[12px]">
                                                {user.assigned.inprogress}
                                            </h1>
                                            <p className="text-xs text-gray-500">inprogress</p>
                                        </div>

                                        <div className="py-2 border-l border-gray-200">
                                            <h1 className="text-indigo-500 font-bold text-[12px]">
                                                {user.assigned.closed}
                                            </h1>
                                            <p className="text-xs text-gray-500">closed</p>
                                        </div>
                                    </div>


                                    {/* CREATED SECTION */}
                                    <p className="mt-4 mb-2 text-xs text-gray-500 font-semibold">
                                        Tickets created by this user
                                    </p>

                                    <div className="grid grid-cols-4 text-center    overflow-hidden">
                                        <div className="py-2">
                                            <h1 className="text-indigo-500 font-bold text-[12px]">
                                                {user.created.new}
                                            </h1>
                                            <p className="text-xs text-gray-500">new</p>
                                        </div>

                                        <div className="py-2 border-l border-gray-200">
                                            <h1 className="text-indigo-500 font-bold text-[12px]">
                                                {user.created.open}
                                            </h1>
                                            <p className="text-xs text-gray-500">open</p>
                                        </div>

                                        <div className="py-2 border-l border-gray-200">
                                            <h1 className="text-indigo-500 font-bold text-[12px]">
                                                {user.created.inprogress}
                                            </h1>
                                            <p className="text-xs text-gray-500">inprogress</p>
                                        </div>

                                        <div className="py-2 border-l border-gray-200">
                                            <h1 className="text-indigo-500 font-bold text-[12px]">
                                                {user.created.closed}
                                            </h1>
                                            <p className="text-xs text-gray-500">closed</p>
                                        </div>
                                    </div>


                                </div>

                            )
                        })

                }



            </section>

        </div>
    );
}
