import AuditLogList from "@/components/AuditLogList";
import { Audit, Comment } from "@prisma/client";
import ViewContext from "@/components/ViewContext";
import Image from "next/image";
import AssignBox from "./AssignBox";
import CommentBox from "./CommentBox";
import { getCommentWithTicketId } from "../../action";
import StatusBox from "./StatusBox";
import TicketDetails from "./TicketDetails";
// import { useState } from "react";
// import SelectBox from "@/components/SelectBox";

export type TicketWithRelations = {
    id: string;
    ticketId: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    createdAt: Date;
    updatedAt: Date;
    assignedToId?: string | null;



    category: {
        id: string;
        name: string;
    };
    subcategory: {
        id: string;
        name: string;
    },

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

enum Status {
    OPEN = "OPEN",
    IN_PROGRESS = "IN_PROGRESS",
    RESOLVED = "RESOLVED",
    CLOSED = "CLOSED",
}

export type TicketViewProps = {
    ticket: TicketWithRelations;
    auditLog?: Audit[];
    title?: string;
    users: {
        id: string;
        email: string;
        name: string;
    }[]
};


// Define a CommentWithRelations type
export type CommentWithRelations = Comment & {
    commenter?: {
        id: string | null;
        name: string | null;
        email: string | null;
    } | null;
    replies?: CommentWithRelations[]; // ✅ required replies array
    likes?: {
        id: string; // CommentLike id
        user: {
            id: string;
            name: string;
            email: string;
        };
    }[];
};

export async function TicketView({
    ticket,
    auditLog,
    title = "View Ticket",
    users
}: TicketViewProps) {

    const commets: CommentWithRelations[] = await getCommentWithTicketId(ticket.id)



    return (
        <section className="grid gap-6 md:grid-cols-3" aria-label="Ticket details">
            {/* Left side: Ticket details */}
            <TicketDetails ticket={ticket} users={users} comments={commets} />

            {/* Right side: Audit Log */}
            <div className="border-l-4 border-indigo-300 shadow-sm transition-shadow hover:shadow-md rounded-lg bg-white" >
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
            </div >
        </section >
    );
}

export default TicketView;
