// src/libs/api-auth-wrapper.ts
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUserId } from "@/libs/action";
import { getUserIdFromBasicAuth } from "./basic-auth";


// Typescript တွင် any မသုံးရန် Generics <TContext> ကို သုံးထားပါသည်
type ApiHandler<TContext> = (request: NextRequest, userId: string, context: TContext) => Promise<NextResponse>;

export function withAuth<TContext>(handler: ApiHandler<TContext>) {
    return async function (request: NextRequest, context: TContext) {

        // ၁။ Session စစ်ဆေးခြင်း (Browser/UI မှ ဝင်လာသူများအတွက်)
        const sessionUserId = await getCurrentUserId();

        // ၂။ Email & Password (Basic Auth) စစ်ဆေးခြင်း (Postman/OTRS မှ ဝင်လာသူများအတွက်)
        // (ဤနေရာတွင် ယခင်က ရေးခဲ့သော Redis ဖြင့် အမြန်လုပ်ထားသည့် Code က အလုပ်လုပ်သွားပါမည်)
        const basicAuthUserId = await getUserIdFromBasicAuth(request);

        const userId = sessionUserId || basicAuthUserId;

        // Session ရော၊ Email/Password ပါ မမှန်လျှင် ဝင်ခွင့်ပိတ်မည်
        if (!userId) {
            return NextResponse.json(
                { success: false, error: "Unauthorized: Invalid email or password" },
                { status: 401 }
            );
        }

        // အောင်မြင်မှသာ မူလ API ကို userId ဖြင့် ဆက်လုပ်ခွင့်ပေးမည်
        return handler(request, userId, context);
    };
}