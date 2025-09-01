"use client"
import AuditLogList from "@/components/AuditLogList";
import { Audit } from "@prisma/client";
import { DepartmentWithRelations } from "../../page";
import ViewContext from "@/components/ViewContext";
import { useTranslations } from "next-intl";

export type DepartmentViewProps = {
    department: DepartmentWithRelations;
    auditLog?: Audit[];
    title?: string;
};

export function DepartmentView({
    department,
    auditLog,
    title = "View Department",
}: DepartmentViewProps) {

    const t = useTranslations('viewContext');
    const tHistory = useTranslations("historyLog");
    return (
        <section
            className="grid gap-6 md:grid-cols-3"
            aria-label="Department details"
        >
            {/* Card Container */}
            <div className="h-fit md:sticky top-0 col-span-2 border-l-4 border-indigo-500 shadow-sm transition-shadow hover:shadow-md rounded-lg bg-white">
                {/* Card Header */}
                {/* < className="pb-4 px-6 pt-6"> */}
                <div className=" gap-2 pb-4 px-6 pt-6" >

                    <h2 className="text-lg font-semibold text-indigo-600">{title}</h2>
                </div>



                {/* Card Content */}
                <div className="pt-2 px-6 pb-6">
                    <div className="space-y-4">
                        {/* Department Name */}
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <h3 className="text-xl font-semibold leading-none">
                                    {department.name}
                                </h3>

                                <p className="mt-3 text-sm text-muted-foreground">
                                    {department.description ?? "—"}
                                </p>
                            </div>
                        </div>

                        {/* Separator */}
                        <div className="border-t border-gray-200" />

                        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">





                            <ViewContext
                                label={t("contact")}
                                value={department.contact ?? "—"}
                                type="tel"
                            />
                            <ViewContext
                                label={t("email")}
                                value={department.email ?? "—"}
                                type="email"
                            />
                            <ViewContext
                                label={t("managerName")}
                                value={department.manager?.name ?? "—"}
                            />
                            <ViewContext
                                label={t("managerEmail")}
                                value={department.manager?.email ?? "—"}
                                type="email"
                            />
                            <ViewContext
                                label={t("createdBy")}
                                value={department.creator?.name ?? "—"}
                            />
                            <ViewContext
                                label={t("updatedBy")}
                                value={department.updater?.name ?? "—"}
                            />
                            <ViewContext
                                label={t("createdAt")}
                                value={new Date(department.createdAt).toLocaleString("en-US", {
                                    timeZone: "Asia/Yangon",
                                })}
                            />
                            <ViewContext
                                label={t("updatedAt")}
                                value={new Date(department.updatedAt).toLocaleString("en-US", {
                                    timeZone: "Asia/Yangon",
                                })}
                            />
                            <ViewContext
                                label={t("ticketsCount")}
                                value={`${department.tickets?.length ?? 0} Ticket${department.tickets?.length === 1 ? '' : 's'}`}
                            />
                            <ViewContext
                                label={t("isArchived")}
                                value={department.isArchived ? "Yes" : "No"}
                            />

                            <div className="flex flex-col items-start gap-1.5 col-span-2">
                                <h3 className="text-xs tracking-wide text-muted-foreground">{t("positions")}</h3>
                                <div className="text-sm font-medium">
                                    {department.positions?.map(job => (
                                        <p className="border border-gray-300 rounded-full px-3 py-1" key={job.id}>
                                            {job.name}
                                        </p>
                                    ))}
                                </div>
                            </div>

                        </dl>
                    </div>
                </div>
            </div>

            {/* Audit Log Card */}
            <div className="border-l-4 border-indigo-300 shadow-sm transition-shadow hover:shadow-md rounded-lg bg-white">
                <div className="pb-4 px-6 pt-6">
                    <h2 className="flex items-center gap-2 text-lg font-semibold">
                        <span>{tHistory("title")}</span>
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {tHistory("description.department")}
                    </p>
                </div>
                <div className="pt-2 px-6 pb-6">
                    <AuditLogList items={auditLog} />
                </div>
            </div>
        </section>
    );
}

export default DepartmentView;
