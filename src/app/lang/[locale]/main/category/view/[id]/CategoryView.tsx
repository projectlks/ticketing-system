"use client"
import AuditLogList from "@/components/AuditLogList";
import { Audit } from "@prisma/client";
import ViewContext from "@/components/ViewContext";
import { CategoryWithRelations } from "../../page";
import { useTranslations } from "next-intl";

export type CategoryViewProps = {
    category: CategoryWithRelations;
    auditLog?: Audit[];
    title?: string;
};

export function CategoryView({
    category,
    auditLog,
    title = "View Category",
}: CategoryViewProps) {


    const t = useTranslations('viewContext');
    const tHistory = useTranslations("historyLog");
    return (
        <section
            className="grid gap-6 md:grid-cols-2 xl:grid-cols-3"
            aria-label="Category details"
        >
            {/* Card Container */}
            <div className="h-fit md:sticky col-span-2 top-0 border-l-4 border-indigo-500 shadow-sm transition-shadow hover:shadow-md rounded-lg bg-white dark:bg-gray-800 dark:border-indigo-400 dark:shadow-md">
                {/* Card Header */}
                <div className="gap-2 pb-4 px-6 pt-6">
                    <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">{title}</h2>
                </div>

                {/* Card Content */}
                <div className="pt-2 px-6 pb-6 text-gray-900 dark:text-gray-100">
                    <div className="space-y-4">
                        {/* Category Name */}
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <h3 className="text-xl font-semibold leading-none">{category.name}</h3>
                            </div>
                        </div>

                        {/* Separator */}
                        <div className="border-t border-gray-200 dark:border-gray-700" />

                        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <ViewContext
                                label={t("createdAt")}
                                value={new Date(category.createdAt).toLocaleString("en-US", {
                                    timeZone: "Asia/Yangon",
                                })}
                            />

                            <ViewContext
                                label={t("createdBy")}
                                value={category.creator?.name || "-"}
                            />

                            <ViewContext
                                label={t("updatedAt")}
                                value={new Date(category.updatedAt).toLocaleString("en-US", {
                                    timeZone: "Asia/Yangon",
                                })}
                            />

                            <ViewContext
                                label={t("updatedBy")}
                                value={category.updater?.name || "-"}
                            />

                            <ViewContext
                                label={t("ticketsCount")}
                                value={category.tickets?.length?.toString() || "0"}
                            />
                        </dl>
                    </div>
                </div>
            </div>

            {/* Audit Log Card */}
            <div className="border-l-4 border-indigo-300 shadow-sm transition-shadow hover:shadow-md rounded-lg bg-white dark:bg-gray-800 dark:border-indigo-400 dark:shadow-md">
                <div className="pb-4 px-6 pt-6">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                        <span>{tHistory("title")}</span>
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground dark:text-gray-400">
                        {tHistory("description.category")}
                    </p>
                </div>
                <div className="pt-2 px-6 pb-6">
                    <AuditLogList items={auditLog} />
                </div>
            </div>
        </section>

    );
}

export default CategoryView;
