"use client";

import Header from "@/components/Header";
import { useEffect, useState } from "react";
import Portal from "@/components/Portal";
import Form from "./Form";
import { deleteAccount, getAllAccounts, restoreAccount } from "./action";
import { User } from "@prisma/client";
import TableBody from "@/components/TableBody";
import DotMenu from "@/components/DotMenu";
import TableHead from "@/components/TableHead";
import Swal from 'sweetalert2';
import Button from "@/components/Button";
import { ArrowLongRightIcon, ArrowLongLeftIcon, ChevronDownIcon, ArrowDownCircleIcon } from "@heroicons/react/24/outline";
import Loading from "@/components/Loading";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export type UserWithRelations = User & {
    creator?: {
        name: string | null;
        email: string | null;
    } | null;
    updater?: {
        name: string | null;
        email: string | null;
    } | null;
    assignedTickets?: {
        id: string;
        title: string;
        status: string;
        priority: string;
    }[] | null;
    jobPosition?: {
        id: string;
        name: string;
    } | null;
    department?: {
        id: string;
        name: string;
    } | null;
};

export default function Page() {


    const [showForm, setShowForm] = useState(false);
    const [accounts, setAccounts] = useState<UserWithRelations[]>([]);
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [updateID, setUpdateID] = useState<string | null>(null);
    const [isFetching, setIsFetching] = useState(false);
    const [take, setTake] = useState(10); // default 10
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);



    const router = useRouter();

    const { data: session } = useSession()



    const fetchAccounts = async (currentPage: number) => {
        try {
            // setLoading(true);
            const { data, total } = await getAllAccounts(currentPage, searchQuery, session?.user?.role || '', take);
            const totalPages = Math.ceil(total / take);
            // page က totalPages ထက်ကြီးနေပြီး totalPages > 0 ဆိုရင်
            if (currentPage > totalPages && totalPages > 0) {
                setPage(totalPages); // နောက်ဆုံး valid page ကို သတ်မှတ်ပေး
                return; // ဒီနေရာမှာ setPage ပြင်လိုက်ပြီး fetch ထပ်လုပ်ဖို့ useEffect က လုပ်ပေးမယ်
            } else {
                setAccounts(data);
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
    }, [searchQuery, page, take]);
    // ✅

    useEffect(() => {
        setPage(1); // Search ပြန်လုပ်တိုင်း page ကို 1 ပြန်ထားမယ်
    }, [searchQuery]);


    const handleDelete = async (id: string) => {
        try {
            const result = await Swal.fire({
                title: 'Are you sure?',
                text: 'You won’t be able to revert this!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Yes, delete it!',
            });

            if (result.isConfirmed) {
                await deleteAccount(id);

                if (data?.user.role === "SUPER_ADMIN") {
                    setAccounts(accounts.map(acc => acc.id === id ? { ...acc, isArchived: true } : acc));

                }
                else {

                    setAccounts(accounts.filter(account => account.id !== id));
                }

                Swal.fire({
                    title: 'Deleted!',
                    text: 'The account has been deleted.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false,
                });
            }
        } catch (error) {
            console.error("Failed to delete account:", error);
            Swal.fire({
                title: 'Error!',
                text: 'Failed to delete the account.',
                icon: 'error',
            });
        }
    };



    const handleRestore = async (id: string) => {
        try {
            const result = await Swal.fire({
                title: 'Are you sure?',
                text: 'Do you want to restore this account?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, restore it!',
            });

            if (result.isConfirmed) {
                // Update isArchived to false

                await restoreAccount(id);


                // Update UI
                setAccounts(accounts.map(acc => acc.id === id ? { ...acc, isArchived: false } : acc));

                Swal.fire({
                    title: 'Restored!',
                    text: 'The account has been restored.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false,
                });
            }
        } catch (error) {
            console.error("Failed to restore account:", error);
            Swal.fire({
                title: 'Error!',
                text: 'Failed to restore the account.',
                icon: 'error',
            });
        }
    };



    const handleEdit = (e: React.MouseEvent<HTMLButtonElement>, id: string) => {
        e.stopPropagation();
        setUpdateID(id);
        setShowForm(true);
    }
    const toggleSelectAccounts = (id: string) => {
        setSelectedAccounts((prev) =>
            prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
        );
    };

    const { data } = useSession()




    const downloadExcel = (users: UserWithRelations[], selectedUsers: string[]) => {
        const dataToExport = users
            .filter((u) => selectedUsers.includes(u.id))
            .map((u) => ({
                ID: u.id,
                Name: u.name,
                Email: u.email,
                Role: u.role,
                ProfileUrl: u.profileUrl ?? "-",
                CreatedAt: new Date(u.createdAt).toLocaleString("en-US", { timeZone: "Asia/Yangon" }),
                UpdatedAt: new Date(u.updatedAt).toLocaleString("en-US", { timeZone: "Asia/Yangon" }),
                IsArchived: u.isArchived ? "Yes" : "No",

                // HR fields
                EmployeeId: u.employeeId ?? "-",
                Status: u.status ?? "-",
                WorkMobile: u.workMobile ?? "-",
                PersonalPhone: u.personalPhone ?? "-",
                Address: u.address ?? "-",
                PersonalEmail: u.personalEmail ?? "-",
                Language: u.language ?? "-",
                EmergencyContact: u.emergencyContact ?? "-",
                EmergencyPhone: u.emergencyPhone ?? "-",
                Nationality: u.nationality ?? "-",
                IdentificationNo: u.identificationNo ?? "-",
                PassportNo: u.passportNo ?? "-",
                DateOfBirth: u.dateOfBirth ? new Date(u.dateOfBirth).toLocaleDateString("en-US") : "-",
                MaritalStatus: u.maritalStatus ?? "-",
                NumberOfChildren: u.numberOfChildren ?? "-",

                // Relations
                Department: u.department?.name ?? "-",
                JobPosition: u.jobPosition?.name ?? "-",
                CreatorName: u.creator?.name ?? "-",
                CreatorEmail: u.creator?.email ?? "-",
                UpdaterName: u.updater?.name ?? "-",
                UpdaterEmail: u.updater?.email ?? "-",

                // Tickets assigned/requested (just join titles/ids for export)
                AssignedTickets: u.assignedTickets?.map(t => `${t.title} [${t.status}]`).join(" | ") ?? "-",
            }));

        if (dataToExport.length === 0) {
            alert("Please select users to download");
            return;
        }

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Users");

        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(blob, "users.xlsx");
    };

    return (
        <>

            {isFetching && <Loading />}
            <div className="w-full min-h-full bg-white pb-10 rounded-lg">
                <Header
                    title="Users"
                    placeholder="Search by name or email"
                    click={() => setShowForm(true)}
                    setSearchQuery={setSearchQuery}
                    searchQuery={searchQuery}
                    showNewBtn={["ADMIN", "SUPER_ADMIN"].includes(data?.user.role ?? "")}
                    downloadBtn={<div>
                        <button onClick={() => downloadExcel(accounts, selectedAccounts)} className="bg-indigo-500 px-2 py-1 rounded text-gray-100">
                            <ArrowDownCircleIcon className="w-6 h-6" />
                        </button>
                    </div>}
                />

                {/*  */}

                {/* Excel Download */}


                <div className="p-5">
                    {accounts.length > 0 ? (
                        <div className="rounded">
                            <div className="max-w-full overflow-x-auto">
                                <table className="w-full min-w-[1102px] border border-gray-200">
                                    <thead>
                                        <tr className="border-b border-gray-100">
                                            <th className="px-3">
                                                <input
                                                    type="checkbox"
                                                    onChange={(e) =>
                                                        e.target.checked
                                                            ? setSelectedAccounts(accounts.map((t) => t.id))
                                                            : setSelectedAccounts([])
                                                    }
                                                    checked={selectedAccounts.length === accounts.length && accounts.length > 0}
                                                />
                                            </th>
                                            <TableHead data="No." />
                                            <TableHead data="Name" />
                                            <TableHead data="Email" />
                                            <TableHead data="Role" />
                                            <TableHead data="Department" />
                                            <TableHead data="Job Position" />
                                            {/* <TableHead data="Created At" />
                                            <TableHead data="Updated At" /> */}
                                            <TableHead data="Creator" />
                                            <TableHead data="Actions" />
                                            {/* {(data?.user.role === "SUPER_ADMIN") && <TableHead data="Restore" />} */}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {accounts.map((account, index) => (
                                            <tr
                                                // onClick={() => { router.push(`/main/accounts/view/${account.id}`) }}
                                                key={account.id}
                                                className={
                                                    `
                                                    border-b border-gray-100  ${account.isArchived ? "bg-red-100" : " hover:bg-gray-50 "}
                                                    `
                                                }
                                            >
                                                {/* Selection checkbox */}
                                                <td className="px-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedAccounts.includes(account.id)}
                                                        onChange={() => toggleSelectAccounts(account.id)}
                                                        onClick={(e) => e.stopPropagation()} // prevent row click
                                                    />
                                                </td>
                                                <TableBody data={String((page - 1) * take + index + 1)} />
                                                <TableBody data={account.name} />
                                                <TableBody data={account.email} />
                                                <TableBody data={account.role} />
                                                <TableBody data={account.department?.name || ''} />
                                                <TableBody data={account.jobPosition?.name || ''} />




                                                <td className={`px-5 py-4 sm:px-6 `}>
                                                    <p className="text-gray-500 truncate">{account.creator
                                                        ? account.creator.name || "-"
                                                        : "-"}</p>

                                                    <p className="text-gray-500 text-xs truncate">
                                                        {account.creator
                                                            ? account.creator.email || "-"
                                                            : "-"}
                                                    </p>
                                                </td>

                                                <td className="px-5 py-4 flex items-center space-x-3 sm:px-6">
                                                    <DotMenu isBottom={index >= accounts.length - 2} option={{
                                                        view: true,
                                                        edit:
                                                            data?.user.role === "SUPER_ADMIN" ||
                                                            (
                                                                data?.user.role === "ADMIN" &&
                                                                account.creatorId === data.user.id &&
                                                                account.role !== "ADMIN"
                                                            ), delete: data?.user.role === "SUPER_ADMIN" && !account.isArchived,
                                                        restore: data?.user.role === "SUPER_ADMIN" && account.isArchived
                                                    }}

                                                        onDelete={() => handleDelete(account.id)}
                                                        onEdit={(e) => handleEdit(e, account.id)}
                                                        onView={() => router.push(`/main/accounts/view/${account.id}`)}
                                                        onRestore={() => handleRestore(account.id)}
                                                    />
                                                </td>
                                                {/* {account.isArchived &&
                                                    (<td className={`px-5 py-4 sm:px-6 `}>
                                                        <Button buttonLabel={"Restore"} click={() => handleRestore(account.id)} />
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
                                    disabled={accounts.length < take || isFetching}
                                    buttonLabel={
                                        <>
                                            <span>Next </span>
                                            <ArrowLongRightIcon className="w-4 h-4" />
                                        </>
                                    }
                                />



                                <div className="relative">
                                    <select
                                        id="take"
                                        value={take}
                                        onChange={(e) => {
                                            setPage(1); // reset to first page when page size changes
                                            setTake(Number(e.target.value));
                                        }}
                                        className="h-[33px] rounded-lg border px-2 pr-5 py-1 text-xs text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300/50 appearance-none border-gray-300"
                                    >
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                        <option value={30}>30</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                        <option value={99999}>All</option>
                                    </select>

                                    <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none">
                                        <ChevronDownIcon className="w-3 h-3" />
                                    </span>
                                </div>



                            </div>
                        </div>
                    ) : (
                        <p className="text-base text-center text-gray-500">No accounts found.</p>
                    )}
                </div>
            </div>

            {showForm && (
                <Portal>
                    <Form setShowForm={setShowForm} setAccounts={setAccounts} updateID={updateID} setUpdateID={setUpdateID} />
                </Portal>
            )}
        </>
    );
}
