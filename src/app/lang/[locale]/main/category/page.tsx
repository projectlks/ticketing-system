"use client";

import Header from "@/components/Header";
import { useEffect, useState } from "react";
import Portal from "@/components/Portal";
import Form from "./Form";
import { deleteCategory, getAllCategories } from "./action";
import { Category } from "@prisma/client";
import TableBody from "@/components/TableBody";
import DotMenu from "@/components/DotMenu";
import TableHead from "@/components/TableHead";
import Swal from 'sweetalert2';
import Button from "@/components/Button";
import { ArrowLongRightIcon, ArrowLongLeftIcon } from "@heroicons/react/24/outline";
import { usePathname, useRouter } from "next/navigation";
import Loading from "@/components/Loading";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

export type CategoryWithRelations = Category & {
    creator?: {
        name: string | null;
        email: string | null;
    } | null;
    updater?: {
        name: string | null;
        email: string | null;
    } | null;
    tickets?: {
        id: string;
        title: string;
        status: string;
    }[] | null;
    subcategories?: {
        id: string;
        name: string;
    }[] | null; // Add this for subcategories

};

export default function Page() {


    const [showForm, setShowForm] = useState(false);
    const [categories, setCategories] = useState<CategoryWithRelations[]>([]);
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const take = 10;
    const [updateID, setUpdateID] = useState<string | null>(null);
    const [isFetching, setIsFetching] = useState(false);


    const router = useRouter();


    const fetchAccounts = async (currentPage: number) => {
        try {
            const { data, total } = await getAllCategories(currentPage, searchQuery);
            const totalPages = Math.ceil(total / take);
            // page က totalPages ထက်ကြီးနေပြီး totalPages > 0 ဆိုရင်
            if (currentPage > totalPages && totalPages > 0) {
                setPage(totalPages); // နောက်ဆုံး valid page ကို သတ်မှတ်ပေး
                return; // ဒီနေရာမှာ setPage ပြင်လိုက်ပြီး fetch ထပ်လုပ်ဖို့ useEffect က လုပ်ပေးမယ်
            } else {
                setCategories(data);
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
                await deleteCategory(id);
                setCategories(categories.filter(category => category.id !== id));

                Swal.fire({
                    title: 'Deleted!',
                    text: 'The category has been deleted.',
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



    const handleEdit = (e: React.MouseEvent<HTMLButtonElement>, id: string) => {
        e.stopPropagation()
        setUpdateID(id);
        setShowForm(true);
    }


    const { data } = useSession()
    const t = useTranslations("table")
    const tHeader = useTranslations("header");

    const pathname = usePathname();
    const segments = pathname.split("/");
    const locale = segments[2] || "en";

    return (
        <>
            {isFetching && <Loading />}

            <div className="w-full min-h-full bg-white dark:bg-gray-900 pb-10 rounded-lg">
                <Header
                    title={tHeader("categories.title")}
                    placeholder={tHeader("categories.placeholder")}
                    click={() => setShowForm(true)}
                    setSearchQuery={setSearchQuery}
                    searchQuery={searchQuery}
                    showNewBtn={data?.user.role === "SUPER_ADMIN"}
                />

                <div className="p-5">
                    {categories.length > 0 ? (
                        <div className="rounded">
                            <div className="max-w-full overflow-x-auto">
                                <table className="w-full min-w-[1102px] border border-gray-200 dark:border-gray-700">
                                    <thead>
                                        <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                                            <TableHead data={t("no")} />
                                            <TableHead data={t("name")} />
                                            <TableHead data={t("createdAt")} />
                                            <TableHead data={t("updatedAt")} />
                                            <TableHead data={t("creator")} />
                                            <TableHead data={t("actions")} />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {categories.map((category, index) => (
                                            <tr
                                                key={category.id}
                                                className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                                            >
                                                <TableBody data={String((page - 1) * take + index + 1)} />
                                                <TableBody data={category.name} />
                                                <TableBody
                                                    data={new Date(category.createdAt).toLocaleString("en-US", { timeZone: "Asia/Yangon" })}
                                                />
                                                <TableBody
                                                    data={new Date(category.updatedAt).toLocaleString("en-US", { timeZone: "Asia/Yangon" })}
                                                />
                                                <td className="px-5 py-4 sm:px-6">
                                                    <p className="text-gray-700 dark:text-gray-300 truncate">
                                                        {category.creator?.name ?? "-"}
                                                    </p>
                                                    <p className="text-gray-500 dark:text-gray-400 text-xs truncate">
                                                        {category.creator?.email ?? "-"}
                                                    </p>
                                                </td>
                                                <td className="px-5 py-4 flex items-center space-x-3 sm:px-6">
                                                    <DotMenu
                                                        isBottom={index >= categories.length - 2}
                                                        option={{ view: true, edit: data?.user.role === "SUPER_ADMIN" }}
                                                        onEdit={(e) => handleEdit(e, category.id)}
                                                        onView={() => router.push(`/lang/${locale}/main/category/view/${category.id}`)}
                                                    />
                                                </td>
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
                                    disabled={categories.length < take || isFetching}
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
                        <p className="text-base text-center text-gray-500 dark:text-gray-400">No categories found.</p>
                    )}
                </div>
            </div>

            {showForm && (
                <Portal containerId="modal-root">
                    <Form
                        setShowForm={setShowForm}
                        setCategories={setCategories}
                        updateID={updateID}
                        setUpdateID={setUpdateID}
                    />
                </Portal>
            )}
        </>
    );
}
