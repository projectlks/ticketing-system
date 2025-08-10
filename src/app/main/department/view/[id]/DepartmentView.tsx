import AuditLogList from "@/components/AuditLogList";
import {
    EnvelopeIcon,
    PhoneIcon,
    UserIcon,
    BuildingOffice2Icon,
    InformationCircleIcon,
    ChevronLeftIcon,
} from "@heroicons/react/24/outline";
import { Audit } from "@prisma/client";
import { DepartmentWithRelations } from "../../page";



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
    return (
        <section className={"grid gap-6 md:grid-cols-2"} aria-label="Department details">




            {/* Card Container */}
            <div className="h-fit border-l-4 border-indigo-500 shadow-sm transition-shadow hover:shadow-md rounded-lg bg-white">
                {/* Card Header */}
                <div className="pb-4 px-6 pt-6">
                    <div className="flex items-center gap-2">
                        <BuildingOffice2Icon className="h-5 w-5 text-indigo-600" aria-hidden="true" />
                        <h2 className="text-lg font-semibold">{title}</h2>
                    </div>
                    <div
                        aria-hidden="true"
                        className="mt-3 h-1.5 w-28 rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600/70"
                    />
                </div>
                {/* Card Content */}
                <div className="pt-2 px-6 pb-6">
                    <div className="space-y-4">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <h3 className="text-xl font-semibold leading-none">{department.name}</h3>
                                <p className="mt-1 text-sm text-muted-foreground">Department overview</p>
                            </div>
                           
                        </div>

                        {/* Separator */}
                        <div className="border-t border-gray-200" />

                        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="flex items-start gap-3">
                                <UserIcon className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                <div>
                                    <dt className="text-xs tracking-wide text-muted-foreground">Manager</dt>
                                    <dd className="text-sm font-medium">{department.manager?.name}</dd>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <PhoneIcon className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                <div>
                                    <dt className="text-xs tracking-wide text-muted-foreground">Contact</dt>
                                    <dd className="text-sm font-medium">
                                        <a
                                            href={`tel:${department.contact}`}
                                            className=""
                                        >
                                            {department.contact}
                                        </a>
                                    </dd>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 sm:col-span-2">
                                <EnvelopeIcon className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                <div className="min-w-0">
                                    <dt className="text-xs tracking-wide text-muted-foreground">Email</dt>
                                    <dd className="text-sm font-medium break-all">
                                        <a
                                            href={`mailto:${department.email}`}
                                            className="underline decoration-indigo-300 underline-offset-4 hover:decoration-indigo-500"
                                        >
                                            {department.email}
                                        </a>
                                    </dd>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 sm:col-span-2">
                                <InformationCircleIcon
                                    className="mt-0.5 h-4 w-4 text-muted-foreground"
                                    aria-hidden="true"
                                />
                                <div className="min-w-0">
                                    <dt className="text-xs tracking-wide text-muted-foreground">Description</dt>
                                    <dd className="text-sm leading-relaxed">
<div className="mt-1 rounded-md border bg-muted/40 w-full max-w-screen-md overflow-hidden whitespace-pre-wrap break-words p-3">
  {department.description}
</div>
                                    </dd>
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
                        <span>Audit Log</span>
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">Recent changes to this department.</p>
                </div>
                <div className="pt-2 px-6 pb-6">
                    <AuditLogList items={auditLog} />
                </div>
            </div>
        </section>
    );
}

export default DepartmentView;
