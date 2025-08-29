"use client";

import { usePathname, useRouter } from "next/navigation";
import { Audit } from "@prisma/client";
import { AuditWithRelations, TicketWithRelations } from "./page";
import TableBody from "@/components/TableBody";
import TableHead from "@/components/TableHead";
import DotMenu from "@/components/DotMenu";
import moment from "moment";

import {
    PlusIcon,
    CheckIcon,
    UserIcon,
    ChatBubbleLeftIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

interface Props {
    tickets: TicketWithRelations[];
    audit: AuditWithRelations[];
}

export default function Dashboard({ tickets, audit }: Props) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-fit">
            <RecentTickets tickets={tickets} />
            <ActivityFeed activities={audit} />
        </div>
    );
}

function RecentTickets({ tickets }: { tickets: TicketWithRelations[] }) {
    const router = useRouter();
    const t = useTranslations("dashboard");
    const tTable = useTranslations("table");

    type StatusType = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

    const statusColors: Record<StatusType | "DEFAULT", { bg: string; borderAndText: string }> = {
        OPEN: { bg: "bg-green-500", borderAndText: "border-green-500 text-green-500" },
        IN_PROGRESS: { bg: "bg-yellow-500", borderAndText: "border-yellow-500 text-yellow-500" },
        RESOLVED: { bg: "bg-blue-500", borderAndText: "border-blue-500 text-blue-500" },
        CLOSED: { bg: "bg-gray-500", borderAndText: "border-gray-500 text-gray-500" },
        DEFAULT: { bg: "bg-gray-500", borderAndText: "border-red-500 text-red-500" },
    };

    const getStatusColor = (status: string, type: "bg" | "borderAndText" = "bg") => {
        const key = status as StatusType;
        return statusColors[key]?.[type] ?? statusColors.DEFAULT[type];
    };
    const pathname = usePathname();
    const segments = pathname.split("/");
    const locale = segments[2] || "en";


    return (
        <div className="lg:col-span-2 bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">{t("recentTickets")}</h3>
                <a
                    onClick={() => router.push("/main/tickets")}
                    className="text-sm cursor-pointer text-blue-600 hover:text-blue-500"
                >
                    {t("viewAll")}
                </a>
            </div>
            <div className="overflow-x-auto min-h-[calc(100%-60px)]">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                        <tr className="border border-gray-100">
                            <TableHead data={tTable("ticketId")} />
                            <TableHead data={tTable("title")} />
                            <TableHead data={tTable("description")} />
                            <TableHead data={tTable("status")} />
                            <TableHead data={tTable("createdAt")} />
                            <TableHead data={tTable("actions")} />
                        </tr>
                    </thead>
                    <tbody>
                        {tickets.map((ticket, index) => (
                            <tr key={ticket.id} className="border border-gray-100">
                                <TableBody data={ticket.ticketId} />
                                <TableBody data={ticket.title} />
                                <TableBody data={ticket.description} />
                                <td className="px-5 py-4 sm:px-6">
                                    <div
                                        className={`flex items-center px-2 py-1 rounded-full ${getStatusColor(
                                            ticket.status,
                                            "borderAndText"
                                        )} space-x-2 border-[1px]`}
                                    >
                                        <span
                                            className={`w-2 block aspect-square rounded-full ${getStatusColor(ticket.status)}`}
                                        ></span>
                                        <p className="text-xs truncate">{ticket.status}</p>
                                    </div>
                                </td>
                                <TableBody
                                    data={new Date(ticket.createdAt).toLocaleString("en-US", {
                                        timeZone: "Asia/Yangon",
                                    })}
                                />
                                <td className="px-5 py-4 flex items-center space-x-3 sm:px-6">
                                    <DotMenu
                                        isBottom={index >= tickets.length - 2}
                                        option={{ view: true }}
                                        onView={() => router.push(`/lang/${locale}/main/tickets/view/${ticket.id}`)}

                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>\
                </table>
            </div>
        </div>
    );
}

interface ActivityFeedProps {
    activities: AuditWithRelations[];
}

function ActivityFeed({ activities }: ActivityFeedProps) {
    const t = useTranslations("dashboard");

    const mapActionType = (audit: Audit): string => {
        if (audit.entity === "Ticket" && audit.field === "status" && audit.newValue === "RESOLVED") return "resolve";
        if (audit.entity === "Ticket" && audit.field === "assignedToId") return "assign";
        if (audit.entity === "Ticket" && audit.field === "description" && audit.oldValue == null) return "create";
        if (audit.field === "comment") return "comment";
        return "other";
    };

    const getIcon = (type: string) => {
        switch (type) {
            case "create":
                return <PlusIcon className="h-4 w-4 text-white" />;
            case "resolve":
                return <CheckIcon className="h-4 w-4 text-white" />;
            case "assign":
                return <UserIcon className="h-4 w-4 text-white" />;
            case "comment":
                return <ChatBubbleLeftIcon className="h-4 w-4 text-white" />;
            default:
                return null;
        }
    };

    const getBgColor = (type: string) => {
        switch (type) {
            case "create":
                return "bg-blue-500";
            case "resolve":
                return "bg-green-500";
            case "assign":
                return "bg-yellow-500";
            case "comment":
                return "bg-purple-500";
            default:
                return "bg-gray-500";
        }
    };

    return (
        <div className="bg-white lg:h-full h-fit pb-8 rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">{t("recentActivity")}</h3>
            </div>
            <div className="p-6">
                <ul className="-mb-8">
                    {activities.map((act) => {
                        const type = mapActionType(act);
                        return (
                            <li key={act.id}>
                                <div className="relative pb-8">
                                    <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"></span>
                                    <div className="relative flex space-x-3">
                                        <div>
                                            <span
                                                className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${getBgColor(
                                                    type
                                                )}`}
                                            >
                                                {getIcon(type)}
                                            </span>
                                        </div>
                                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                            <div>
                                                <p className="text-sm text-gray-500">
                                                    {t("changedFromTo", {
                                                        entity: act.entity,
                                                        field: act.field,
                                                        oldValue: act.oldValue ?? "N/A",
                                                        newValue: act.newValue ?? "N/A",
                                                    })}
                                                </p>
                                            </div>
                                            <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                                <time>{moment(act.changedAt).fromNow()}</time>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}
