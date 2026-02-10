import { Audit, Status } from "@/generated/prisma/client";
import { TicketFormData } from "./ticket.schema";
import { CommentWithRelations } from "@/components/CommentSection";

export type TicketImage = {
    id: string;
    url: string;
};

export type TicketData = {
    id: string;
    ticketId: string;
    title: string;
    description: string;
    departmentId: string | null;
    categoryId: string | null;
    priority: TicketFormData["priority"] | null;
    images?: TicketImage[];
    resolutionDue?: Date;
    status: Status;
    assignedToId: string | null;
};

export type TicketFormProps = {
    mode: "create" | "edit";
    ticket?: TicketData | null;
    cats: { id: string; name: string; departmentId: string }[];
    depts: { id: string; name: string }[];
    users: {
        id: string;
        name: string;
        email: string;
        departmentId: string;
    }[];
    auditLog?: Audit[];
    comment?: CommentWithRelations[]
};
