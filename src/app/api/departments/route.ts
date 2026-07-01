// route.ts
import { NextResponse, } from "next/server";
import { prisma } from "@/libs/prisma";
import { withAuth } from "@/libs/api-auth-wrapper"; // 🌟 withAuth ကို Import လုပ်ပါမည်

// 🌟 GET function ကို withAuth ဖြင့် ပတ်လိုက်ပါပြီ
export const GET = withAuth(async () => {
    // လုံခြုံရေးစစ်တဲ့ အပိုင်းတွေ (Session စစ်တာ၊ Basic Auth စစ်တာ၊ Token စစ်တာ) ကို 
    // ဒီထဲမှာ ရေးစရာမလိုတော့ပါဘူး။ withAuth က အလိုအလျောက် စစ်ပေးပြီး 
    // Auth အောင်မြင်မှသာ ဒီအထဲကို တရားဝင် userId လေးနဲ့တကွ ဝင်ခွင့်ပေးမှာပါ။

    try {
        // Database မှ ဒေတာများကို ဆွဲထုတ်ခြင်း
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

        // Data Mapping
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
});