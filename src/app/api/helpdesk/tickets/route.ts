import { NextResponse, type NextRequest } from "next/server";
import { createTicket } from "@/app/helpdesk/tickets/_lib/mutations";
import { withAuth } from "@/libs/api-auth-wrapper"; // 🌟 withAuth ကို Import လုပ်ပါမည်

// 🌟 POST function ကို withAuth ဖြင့် ပတ်လိုက်ပါပြီ
export const POST = withAuth(async (request: NextRequest, userId: string) => {

    // လုံခြုံရေးစစ်ဆေးခြင်း (Auth Check) အားလုံးကို withAuth က တာဝန်ယူသွားပါပြီ။
    // အောင်မြင်မှသာ ဒီထဲကို userId နှင့်တကွ ရောက်လာပါမည်။

    try {
        // ၁။ JSON Body ကို ဖတ်ပြီး FormData အဖြစ် ပြောင်းလဲခြင်း
        const body = await request.json();
        const formData = new FormData();

        // UI ကပို့သလိုမျိုး FormData ပုံစံ ပြန်ဖန်တီးခြင်း
        Object.entries(body).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                formData.append(key, String(value));
            }
        });

        // ၂။ UI ကသုံးတဲ့ createTicket Action ကို တိုက်ရိုက်ခေါ်သုံးခြင်း
        // withAuth ကနေ အလိုအလျောက် ရလာတဲ့ "userId" ကို တိုက်ရိုက် ထည့်သုံးလိုက်ရုံပါပဲ
        const result = await createTicket(formData, { actorUserId: userId });

        if ("error" in result) {
            return NextResponse.json({ success: false, error: result.error }, { status: 400 });
        }

        return NextResponse.json({ success: true, data: result.data }, { status: 201 });

    } catch (error) {
        console.error("[api-create-ticket-error]", error);
        return NextResponse.json({ success: false, error: "Failed to create ticket" }, { status: 500 });
    }
});