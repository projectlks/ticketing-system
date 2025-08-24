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
import { ArrowLongRightIcon, ArrowLongLeftIcon } from "@heroicons/react/24/outline";
import Loading from "@/components/Loading";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { prisma } from "@/libs/prisma";

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
};

export default function Page() {


    const [showForm, setShowForm] = useState(false);
    const [accounts, setAccounts] = useState<UserWithRelations[]>([]);
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const take = 10;
    const [updateID, setUpdateID] = useState<string | null>(null);
    const [isFetching, setIsFetching] = useState(false);


    const router = useRouter();

    const { data: session } = useSession()



    const fetchAccounts = async (currentPage: number) => {
        try {
            // setLoading(true);
            const { data, total } = await getAllAccounts(currentPage, searchQuery, session?.user?.role || '');
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
    }, [searchQuery, page]);
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


    const { data } = useSession()
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
                />

                <div className="p-5">
                    {accounts.length > 0 ? (
                        <div className="rounded">
                            <div className="max-w-full overflow-x-auto">
                                <table className="w-full min-w-[1102px] border border-gray-200">
                                    <thead>
                                        <tr className="border-b border-gray-100">
                                            <TableHead data="No." />
                                            <TableHead data="Name" />
                                            <TableHead data="Email" />
                                            <TableHead data="Role" />
                                            <TableHead data="Created At" />
                                            <TableHead data="Updated At" />
                                            <TableHead data="Creator" />
                                            <TableHead data="Actions" />
                                            {(data?.user.role === "SUPER_ADMIN") && <TableHead data="Restore" />}
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
                                                <TableBody data={String((page - 1) * take + index + 1)} />
                                                <TableBody data={account.name} />
                                                <TableBody data={account.email} />
                                                <TableBody data={account.role} />
                                                <TableBody data={new Date(account.createdAt).toLocaleString("en-US", { timeZone: "Asia/Yangon" })} />
                                                <TableBody data={new Date(account.updatedAt).toLocaleString("en-US", { timeZone: "Asia/Yangon" })} />


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
                                                        edit: true,
                                                        delete: data?.user.role === "SUPER_ADMIN" && !account.isArchived
                                                    }}

                                                        onDelete={() => handleDelete(account.id)}
                                                        onEdit={(e) => handleEdit(e, account.id)}
                                                        onView={() => router.push(`/main/accounts/view/${account.id}`)}
                                                    />
                                                </td>
                                                {account.isArchived &&
                                                    (<td className={`px-5 py-4 sm:px-6 `}>
                                                        <Button buttonLabel={"Restore"} click={() => handleRestore(account.id)} />
                                                    </td>)}

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
