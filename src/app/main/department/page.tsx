"use client";

import Header from "@/components/Header";
import { useEffect, useState } from "react";
import Portal from "@/components/Portal";
import Form from "./Form";
import { deleteDepartment, getAllDepartments, restoreDepartment } from "./action";
import { Department } from "@prisma/client";
import TableBody from "@/components/TableBody";
import DotMenu from "@/components/DotMenu";
import TableHead from "@/components/TableHead";
import Swal from 'sweetalert2';
import Button from "@/components/Button";
import { ArrowLongRightIcon, ArrowLongLeftIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import Loading from "@/components/Loading";
import { useSession } from "next-auth/react";
import { useRestore } from "@/hooks/useRestore";
import { useDelete } from "@/hooks/useDelete";

export type DepartmentWithRelations = Department & {
    creator?: {
        name: string | null;
        email: string | null;
    } | null;
    updater?: {
        name: string | null;
        email: string | null;
    } | null;
    manager?: {
        name: string | null;
        email: string | null;
    } | null;
    tickets?: {
        id: string;
        title: string;
        status: string;
    }[] | null;
    positions?: {
        id: string;
        name: string;
        creator?: {
            name: string | null;
            email: string | null;
        } | null;
    }[] | null;
};

export default function Page() {


    const [showForm, setShowForm] = useState(false);

    const [departments, setDepartments] = useState<DepartmentWithRelations[]>([]);
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const take = 10;
    const [updateID, setUpdateID] = useState<string | null>(null);
    const [isFetching, setIsFetching] = useState(false);


    const router = useRouter();
    const { handleRestore } = useRestore();
    const { handleDelete } = useDelete();


    const fetchAccounts = async (currentPage: number) => {
        try {
            // setLoading(true);
            const { data, total } = await getAllDepartments(currentPage, searchQuery);
            const totalPages = Math.ceil(total / take);
            // page က totalPages ထက်ကြီးနေပြီး totalPages > 0 ဆိုရင်
            if (currentPage > totalPages && totalPages > 0) {
                setPage(totalPages); // နောက်ဆုံး valid page ကို သတ်မှတ်ပေး
                return; // ဒီနေရာမှာ setPage ပြင်လိုက်ပြီး fetch ထပ်လုပ်ဖို့ useEffect က လုပ်ပေးမယ်
            } else {
                setDepartments(data);
            }
        } catch (error) {
            console.error("Failed to fetch accounts:", error);
        }
    };
    useEffect(() => {
        setIsFetching(true); // ⛔ block buttons during debounce too

        const delayDebounce = setTimeout(() => {
            fetchAccounts(page).finally(() => {
                setIsFetching(false); // ✅ unblocks after actual fetch
            });
        }, 300);

        return () => clearTimeout(delayDebounce);
    }, [searchQuery, page]);
    // ✅

    useEffect(() => {
        setPage(1); // Search ပြန်လုပ်တိုင်း page ကို 1 ပြန်ထားမယ်
    }, [searchQuery]);





    const handleEdit = (e: React.MouseEvent<HTMLButtonElement>, id: string) => {
        e.stopPropagation();
        setUpdateID(id);
        setShowForm(true);
    }

    const { data: session } = useSession(); // ✅ Correct way for client components

    // alert(session)

    return (
        <>

            {isFetching && <Loading />}
            <div className="max-w-full min-h-full  overflow-x-auto bg-white pb-10 rounded-lg">
                <Header
                    title="Departments"
                    placeholder="Search by Department name"
                    click={() => { if (session?.user.role === "SUPER_ADMIN") setShowForm(true) }}
                    setSearchQuery={setSearchQuery}
                    searchQuery={searchQuery}
                    showNewBtn={session?.user.role === "SUPER_ADMIN"}
                />

                <div className="p-5">
                    {departments.length > 0 ? (
                        <div className="rounded">
                            <div className="max-w-full overflow-x-auto">
                                <table className="w-full min-w-[1102px] border border-gray-200">
                                    <thead>
                                        <tr className="border-b border-gray-100">
                                            <TableHead data="No." />
                                            <TableHead data="Name" />
                                            <TableHead data="Description" />
                                            <TableHead data="Manager" />
                                            <TableHead data="Department Email" />
                                            <TableHead data="Department Contact" />

                                            <TableHead data="Actions" />
                                            {/* {(session?.user.role === "SUPER_ADMIN") && <TableHead data="Restore" />} */}

                                        </tr>
                                    </thead>
                                    <tbody>
                                        {departments.map((department, index) => (
                                            <tr

                                                // onClick={() => router.push(`/main/department/view/${department.id}`)}

                                                key={department.id}
                                                className={` border-b border-gray-100 hover:bg-gray-50  ${department.isArchived ? "bg-red-100" : ""} `}
                                            >
                                                <TableBody data={String((page - 1) * take + index + 1)} />
                                                <TableBody data={department.name} />
                                                <TableBody data={department.description || "-"} />
                                                {/* <TableBody data={department.manager?.name || "-"} /> */}
                                                <td className={`px-5 py-4 sm:px-6 `}>
                                                    <p className="text-gray-500 truncate">{department.manager
                                                        ? department.manager.name || "-"
                                                        : "-"}</p>

                                                    <p className="text-gray-500 text-xs truncate">
                                                        {department.manager
                                                            ? department.manager.email || "-"
                                                            : "-"}
                                                    </p>
                                                </td>

                                                <TableBody data={department.email || "-"} />
                                                <TableBody data={department.contact || "-"} />

                                                <td className="px-5 py-4 flex items-center space-x-3 sm:px-6">
                                                    <DotMenu isBottom={index >= departments.length - 2} option={{
                                                        view: true,
                                                        edit: true,
                                                        // delete: session?.user.role === "SUPER_ADMIN"
                                                    }}
                                                        onDelete={() => handleDelete(department.id, setDepartments, deleteDepartment)}
                                                        onEdit={(e) => handleEdit(e, department.id)}
                                                        onView={() => { router.push(`/main/department/view/${department.id}`) }}
                                                    />
                                                </td>

                                                {/* ticket.id, setTickets, restoreTickets */}
                                                {/* {department.isArchived &&
                                                    (<td className={`px-5 py-4 sm:px-6 `}>
                                                        <Button buttonLabel={"Restore"} click={() => handleRestore(department.id, setDepartments, restoreDepartment)} />
                                                    </td>)} */}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>


                            </div>


                            <div className="flex justify-end gap-2 mt-4">

                                <Button
                                    click={() => setPage((prev) => Math.max(1, prev - 1))}
                                    disabled={page === 1 || isFetching}
                                    buttonLabel={
                                        <>
                                            <ArrowLongLeftIcon className="w-4 h-4" />
                                            <span> Prev</span>
                                        </>
                                    }
                                />

                                <Button
                                    click={() => setPage((prev) => prev + 1)}
                                    disabled={departments.length < take || isFetching}
                                    buttonLabel={
                                        <>
                                            <span>Next </span>
                                            <ArrowLongRightIcon className="w-4 h-4" />
                                        </>
                                    }
                                />


                            </div>
                        </div>
                    ) : (
                        <p className="text-base text-center text-gray-500">No Department found.</p>
                    )}
                </div>
            </div>

            {showForm && (
                <Portal>
                    <Form setShowForm={setShowForm} setDepartments={setDepartments} updateID={updateID} setUpdateID={setUpdateID} />
                </Portal>
            )}
        </>
    );
}
