import AuditLogList from "@/components/AuditLogList";
import { Audit } from "@prisma/client";
import ViewContext from "@/components/ViewContext";
import Image from "next/image";

export type TicketWithRelations = {
    id: string;
    ticketId: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    createdAt: Date;
    updatedAt: Date;

    category: {
        id: string;
        name: string;
    };

    department: {
        id: string;
        name: string;
    };

    requester: {
        id: string;
        name: string;
        email: string;
    } | null;

    assignedTo: {
        id: string;
        name: string;
        email: string;
    } | null;

    images: {
        id: string;
        url: string;
    }[];
};

export type TicketViewProps = {
    ticket: TicketWithRelations;
    auditLog?: Audit[];
    title?: string;
};

export function TicketView({
    ticket,
    auditLog,
    title = "View Ticket",
}: TicketViewProps) {
    return (
        <section className="grid gap-6 md:grid-cols-3" aria-label="Ticket details">
            {/* Left side: Ticket details */}
            <div className="h-fit md:sticky col-span-2 top-0 border-l-4 border-indigo-500 shadow-sm transition-shadow hover:shadow-md rounded-lg bg-white">
                <div className="gap-2 pb-4 px-6 pt-6">
                    <h2 className="text-lg font-semibold text-indigo-600">{title}</h2>
                </div>

                <div className="pt-2 px-6 pb-6">
                    <div className="space-y-4">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <h3 className="text-xl font-semibold leading-none">{ticket.title}</h3>
                                <p>{ticket.description}</p>
                            </div>
                        </div>

                        <div className="border-t border-gray-200" />

                        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <ViewContext label="Ticket ID" value={ticket.ticketId} />
                            <ViewContext label="Status" value={ticket.status} />
                            <ViewContext label="Priority" value={ticket.priority} />
                            <ViewContext label="Created At" value={new Date(ticket.createdAt).toLocaleString("en-US", { timeZone: "Asia/Yangon" })} />
                            <ViewContext label="Updated At" value={new Date(ticket.updatedAt).toLocaleString("en-US", { timeZone: "Asia/Yangon" })} />
                            <ViewContext label="Category" value={ticket.category?.name || "-"} />
                            <ViewContext label="Department" value={ticket.department?.name || "-"} />
                            <ViewContext label="Requester" value={ticket.requester?.name || "-"} />
                            <ViewContext label="Assigned To" value={ticket.assignedTo?.name || "-"} />

                            {/* Display ticket images URLs */}
                            <div className="col-span-2">
                                <h3 className="text-lg font-semibold mb-2">Images</h3>

                                <div className="grid grid-cols-3 ">
                                    {ticket.images.length > 0 ? (
                                        <ul className="list-disc list-inside space-y-1">
                                            {ticket.images.map((image) => (
                                                <div key={image.id} className="overflow-hidden rounded-lg">
                                                    <Image
                                                        src={image.url}
                                                        alt={`Ticket image ${image.id}`}
                                                        width={500}
                                                        height={500}
                                                        className="object-cover w-full h-auto"
                                                    />
                                                </div>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-gray-500">No images attached.</p>
                                    )}

                                </div>
                            </div>
                        </dl>
                    </div>
                </div>
            </div>

            {/* Right side: Audit Log */}
            <div className="border-l-4 border-indigo-300 shadow-sm transition-shadow hover:shadow-md rounded-lg bg-white">
                <div className="pb-4 px-6 pt-6">
                    <h2 className="flex items-center gap-2 text-lg font-semibold">
                        <span>Audit Log</span>
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Recent changes to this ticket.
                    </p>
                </div>
                <div className="pt-2 px-6 pb-6">
                    <AuditLogList items={auditLog} />
                </div>
            </div>
        </section>
    );
}

export default TicketView;
