"use server"

import { getCurrentUserId } from "@/libs/action"
import { prisma } from "@/libs/prisma"
import bcrypt from "bcrypt";




export async function getCurrentUserData() {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("No logged-in user found");

    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            creator: true,
            updater: true,

            // Departments
            createdDepartments: true,
            managedDepartments: true,
            updatedDepartments: true,

            // Job positions
            jobPosition: { include: { department: true } }, // fetch job position and its department
            createdJobPositions: { include: { department: true } },

            // Categories
            createdCategories: true,
            updatedCategories: true,

            // Tickets
            requestTickets: {
                include: {
                    category: true,
                    subcategory: true,
                    department: true,
                    assignedTo: true,
                },
            },
            assignedTickets: {
                include: {
                    category: true,
                    subcategory: true,
                    department: true,
                    requester: true,
                },
            },

            // Comments & likes
            comments: { include: { ticket: true } },
            likes: { include: { comment: { include: { ticket: true } } } },

            // Audits
            audits: { include: { user: true } },
        },
    });

    if (!user) throw new Error("User not found");

    return user;
}




export async function changeProfileUrl(id: string, profileUrl: string) {
    return await prisma.user.update({
        where: { id },
        data: { profileUrl },
    });
}


export async function changePassword(currentPassword: string, newPassword: string, id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || !user.password) throw new Error("No user found");
    if (user.isArchived) throw new Error("Account is deleted or does not exist");

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) throw new Error(" Password Incorrect");

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
        where: { id },
        data: {
            password: hashedPassword,
        },
    });

    return { success: true, message: "Password updated successfully" };
}



export async function changePersonalInfo(formData: FormData) {
    const userId = formData.get('userId') as string;
    const name = formData.get('name') as string;
    const personalEmail = formData.get('personalEmail') as string;
    const workPhone = formData.get('workPhone') as string | null;
    const personalPhone = formData.get('personalPhone') as string | null;

    if (!userId || !name) {
        throw new Error('Missing required fields');
    }

    try {
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                name,
                personal_email: personalEmail || null,
                work_mobile: workPhone || null,
                personal_phone: personalPhone || null,
            },
        });

        return updatedUser;
    } catch (err) {
        console.error('Failed to update personal info:', err);
        throw new Error('Failed to update personal info');
    }
}
