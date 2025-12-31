"use client";

import { useEffect, useState } from "react";
import Button from "@/components/Button";
import "react-resizable/css/styles.css";
import { EnvelopeIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { getUsers } from "./action";
import Avatar from "@/components/Avatar";

/* ================= TYPES ================= */

export type TicketStats = {
    id: string;
    name: string;
    email: string;
    assigned: {
        new: number;
        open: number;
        inprogress: number;
        closed: number;
    };
    created: {
        new: number;
        open: number;
        inprogress: number;
        closed: number;
    };
};

type StatusKey = "new" | "open" | "inprogress" | "closed";

/* ================= CONSTANTS ================= */

const STATUS_KEYS: { key: StatusKey; label: string }[] = [
    { key: "new", label: "new" },
    { key: "open", label: "open" },
    { key: "inprogress", label: "inprogress" },
    { key: "closed", label: "closed" },
];

/* ================= COMPONENTS ================= */

function StatusGrid({
    data,
}: {
    data: Record<StatusKey, number>;
}) {
    return (
        <div className="grid grid-cols-4 text-center overflow-hidden">
            {STATUS_KEYS.map((item, index) => (
                <div
                    key={item.key}
                    className={`py-2 ${index !== 0 ? "border-l border-gray-200" : ""}`}
                >
                    <h1 className="text-indigo-500 font-bold text-[12px]">
                        {data[item.key]}
                    </h1>
                    <p className="text-xs text-gray-500">{item.label}</p>
                </div>
            ))}
        </div>
    );
}

/* ================= PAGE ================= */

export default function DepartmentPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [users, setUsers] = useState<TicketStats[]>([]);
    const router = useRouter();

    /* ===== FETCH USERS ===== */
    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getUsers();
                setUsers(data);
            } catch (error) {
                console.error("Failed to load users:", error);
            }
        };

        fetchData();
    }, []);

    /* ===== FILTERED USERS ===== */
    const filteredUsers = users.filter((user) => {
        const query = searchQuery.toLowerCase();
        return (
            user.name.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query)
        );
    });

    return (
        <div className="p-4">
            {/* ================= TOP BAR ================= */}
            <div className="flex justify-between items-center bg-white px-4 py-4 border-b border-gray-300 rounded-t-md">
                <div className="flex items-center space-x-2">
                    <Button
                        click={() => router.push("/helpdesk/user/new")}
                        buttonLabel="NEW"
                    />
                    <h1 className="text-sm text-gray-800 font-medium">Users</h1>
                </div>

                {/* SEARCH */}
                <div className="relative min-w-[40%] flex items-center border border-gray-300 rounded min-h-[34px]">
                    <MagnifyingGlassIcon className="absolute left-3 w-4 h-4 text-gray-700" />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        className="h-6 w-full pl-9 pr-3 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div></div>
            </div>

            {/* ================= USERS GRID ================= */}
            <section className="w-full grid-cols-4 grid gap-4 py-4">
                {filteredUsers.map((user) => (
                    <div
                        key={user.id}
                          onClick={() => router.push(`/helpdesk/user/${user.id}`)}
                        className="w-full h-full bg-white border border-gray-300 px-5 py-3"
                    >
                        {/* USER HEADER */}
                        <div className="flex space-x-2">
                            <Avatar name={user.name} />


                            <div>
                                <h1 className="font-bold text-[18px]">{user.name}</h1>
                                <span className="flex items-end text-[12px] -mt-1 text-indigo-500 space-x-1">
                                    <EnvelopeIcon className="w-4 h-4" />
                                    <p>{user.email}</p>
                                </span>
                            </div>
                        </div>

                        {/* ASSIGNED */}
                        <p className="mt-8 mb-2 text-xs text-gray-500 font-semibold">
                            Assigned to this user
                        </p>
                        <StatusGrid data={user.assigned} />

                        {/* CREATED */}
                        <p className="mt-4 mb-2 text-xs text-gray-500 font-semibold">
                            Tickets created by this user
                        </p>
                        <StatusGrid data={user.created} />
                    </div>
                ))}
            </section>
        </div>
    );
}
