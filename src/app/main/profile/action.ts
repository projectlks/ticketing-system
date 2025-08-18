"use server"

import { getCurrentUserId } from "@/libs/action"
import { prisma } from "@/libs/prisma"
import { User } from "@prisma/client";
import bcrypt from "bcrypt";



export async function getCurrentUserData(): Promise<{ data: User }> {
    const userId = await getCurrentUserId();

    if (!userId) {
        throw new Error("No logged-in user found");
    }

    const data = await prisma.user.findUnique({
        where: {
            id: userId,
        },
    });

    if (!data) {
        throw new Error("User not found");
    }

    return { data };
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
