import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/libs/prisma";
import { getCurrentUserId } from "@/libs/action";
import { getUserIdFromBasicAuth } from "@/libs/basic-auth";


export async function GET(request: NextRequest) {
    // ၁။ လုံခြုံရေး စစ်ဆေးခြင်း (Authentication)
    const sessionUserId = await getCurrentUserId();
    const basicAuthUserId = await getUserIdFromBasicAuth(request);
    const finalActorId = sessionUserId || basicAuthUserId;

    if (!finalActorId) {
        return NextResponse.json(
            { success: false, error: "Unauthorized: Invalid credentials or session" },
            { status: 401 }
        );
    }

    try {
        // ၂။ Database မှ ဒေတာများကို ဆွဲထုတ်ခြင်း (Authentication အောင်မြင်မှသာ အလုပ်လုပ်မည်)
        const departments = await prisma.department.findMany({
            where: { isArchived: false },
            select: {
                id: true,
                name: true,
                categories: {
                    where: { isArchived: false },
                    select: { id: true, name: true },
                    orderBy: { name: 'asc' }
                },
                users: {
                    where: { isArchived: false },
                    select: { id: true, name: true, email: true },
                    orderBy: { name: 'asc' }
                }
            },
            orderBy: { name: 'asc' }
        });

        // ၃။ Data Mapping
        const formattedData = departments.map((dept) => ({
            departmentId: dept.id,
            departmentName: dept.name,
            categories: dept.categories.map((cat) => ({
                categoryId: cat.id,
                categoryName: cat.name
            })),
            users: dept.users.map((user) => ({
                userId: user.id,
                userName: user.name,
                userEmail: user.email
            }))
        }));

        return NextResponse.json({ success: true, data: formattedData });
    } catch (error) {
        console.error("[get-departments-error]", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch departments with relations" },
            { status: 500 }
        );
    }
}