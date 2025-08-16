"use server"

import { getCurrentUserId } from "@/libs/action"
import { prisma } from "@/libs/prisma"


export async function getCurrentUserData() {
    const userId = await getCurrentUserId();

    if (!userId) {
        throw new Error("No logged-in user found");
    }

    const user = await prisma.user.findUnique({
        where: {
            id: userId,
        },
    });

    return user;
}