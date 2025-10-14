import { Audit, Comment } from "@prisma/client";

import { getCommentWithTicketId } from "../../action";
import TicketDetails from "./TicketDetails";

// import { useState } from "react";
// import SelectBox from "@/components/SelectBox";

export type TicketWithRelations = {
    id: string;
    ticketId: string;
    title: string;
    description: string;
    status: string;
    priority: string | null;
    createdAt: Date;
    updatedAt: Date;
    assignedToId?: string | null;

    category: {
        id: string;
        name: string;
    } | null;

    department: {
        id: string;
        name: string;
    } | null;

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
    users
}: TicketViewProps) {

    const commets: CommentWithRelations[] = await getCommentWithTicketId(ticket.id)


    return (
        <section className="grid gap-6 md:grid-cols-3" aria-label="Ticket details">
            {/* Left side: Ticket details */}
            <TicketDetails ticket={ticket} users={users} comments={commets} auditLog={auditLog} />


        </section >
    );
}

export default TicketView;
