

"use server";

import { getCurrentUserId } from "@/libs/action";
import { prisma } from "@/libs/prisma";
import z from "zod";
import { DepartmentTicketStats } from "./page";

const DepartmentFormSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    email: z.string().email(),
    contact: z.string().optional(),
});

export async function createDepartment(formData: FormData): Promise<void> {
    const raw = {
        name: formData.get("name")?.toString() ?? "",
        description: formData.get("description")?.toString() ?? "",
        email: formData.get("email")?.toString() ?? "",
        contact: formData.get("contact")?.toString() ?? "",
    };

    const parsed = DepartmentFormSchema.parse(raw);

    // Check for duplicates
    const existing = await prisma.department.findUnique({
        where: { name: parsed.name },
    });
    if (existing) throw new Error("Department Name already exists");

    const userId = await getCurrentUserId();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    const department = await prisma.department.create({
        data: {
            name: parsed.name,
            description: parsed.description,
            contact: parsed.contact,
            email: parsed.email,
            creatorId: userId,

        }
    });


    await prisma.audit.create({
        data: {
            entity: "Department",
            entityId: department.id,
            field: "ALL",
            oldValue: "",
            newValue: JSON.stringify(parsed),
            userId,
            action: "CREATE",
        },
    });


    // No return value needed
}


export async function getDepartmentNames(): Promise<{ name: string, id: string }[]> {
    const departments = await prisma.department.findMany({
        select: {
            name: true,
            id: true,
        },
    });
    return departments
}


// import prisma from "@/lib/prisma";


export async function getDepartments(): Promise<DepartmentTicketStats[]> {
    const departments = await prisma.department.findMany({
        orderBy: { name: "asc" },
        select: {
            id: true,
            name: true,
            contact: true,
            email: true,
        },
    });

    const results: DepartmentTicketStats[] = [];

    for (const dept of departments) {
        const [
            newCount,
            open,
            closed,
            urgent,
            unassigned,
        ] = await Promise.all([
            prisma.ticket.count({
                where: { departmentId: dept.id, status: "NEW" },
            }),

            prisma.ticket.count({
                where: { departmentId: dept.id, status: "OPEN" },
            }),

            prisma.ticket.count({
                where: { departmentId: dept.id, status: "CLOSED" },
            }),

            prisma.ticket.count({
                where: { departmentId: dept.id, priority: "CRITICAL" },
            }), // urgent

            prisma.ticket.count({
                where: { departmentId: dept.id, assignedToId: null },
            }), // unassigned
        ]);

        results.push({
            id: dept.id,
            name: dept.name,
            contact: dept.contact,
            email: dept.email,
            count: {
                new: newCount,
                open,
                closed,
                urgent,
                unassigned,
            },
        });
    }

    return results;
}
