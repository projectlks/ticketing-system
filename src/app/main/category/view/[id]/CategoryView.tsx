import AuditLogList from "@/components/AuditLogList";
import { Audit } from "@prisma/client";
import ViewContext from "@/components/ViewContext";
import { CategoryWithRelations } from "../../page";

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
    return (
        <section
            className="grid gap-6 md:grid-cols-2"
            aria-label="Category details"
        >
            {/* Card Container */}
            <div className="h-fit md:sticky top-0 border-l-4 border-indigo-500 shadow-sm transition-shadow hover:shadow-md rounded-lg bg-white">
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
                                    {category.name}
                                </h3>

                            </div>
                        </div>

                        {/* Separator */}
                        <div className="border-t border-gray-200" />

                        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">                      


                            <ViewContext
                                label="Created At"
                                value={new Date(category.createdAt).toLocaleString("en-US", {
                                    timeZone: "Asia/Yangon",
                                })}
                            />
                            <ViewContext
                                label="Created By"
                                value={category.creator?.name || "-"}
                            />

                            <ViewContext
                                label="Last Updated At"
                                value={new Date(category.updatedAt).toLocaleString("en-US", {
                                    timeZone: "Asia/Yangon",
                                })}
                            />
                            <ViewContext
                                label="Updated By"
                                value={category.updater?.name || "-"}
                            />

                            {/* <ViewContext
                                label="Is Archived"
                                value={category.isArchived ? "Yes" : "No"}
                            /> */}

                            <ViewContext
                                label="Tickets Count"
                                value={category.tickets?.length?.toString() || "0"}
                            />

                        </dl>
                    </div>
                </div>
            </div>

            {/* Audit Log Card */}
            <div className="border-l-4 border-indigo-300 shadow-sm transition-shadow hover:shadow-md rounded-lg bg-white">
                <div className="pb-4 px-6 pt-6">
                    <h2 className="flex items-center gap-2 text-lg font-semibold">
                        <span>Audit Log</span>
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Recent changes to this department.
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
