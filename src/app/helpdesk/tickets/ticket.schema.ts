import { z } from "zod";

export const TicketSchema = z.object({
    title: z.string().min(5, "Title must be at least 5 characters"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    departmentId: z.string().min(1, "Department is required"),
    categoryId: z.string().min(1, "Category is required"),
    priority: z.enum(["REQUEST", "MINOR", "MAJOR", "CRITICAL"]),
    ticketId: z.string().optional(),
    resolutionDue: z.date().optional(),
    status: z.enum([
        "NEW",
        "OPEN",
        "IN_PROGRESS",
        "RESOLVED",
        "CLOSED",
        "CANCELED",
    ]).optional(),
    assignedToId: z.string().optional(),
});

export type TicketFormData = z.infer<typeof TicketSchema>;
