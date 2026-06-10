import { NextResponse, type NextRequest } from "next/server";
import { createTicket } from "@/app/helpdesk/tickets/_lib/mutations";
import { getUserIdFromBasicAuth } from "@/libs/basic-auth";

export async function POST(request: NextRequest) {
    // ၁။ Authentication (Basic Auth သုံးပြီး User ID ကို ယူမည်)
    const userId = await getUserIdFromBasicAuth(request);
    if (!userId) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        // ၂။ JSON Body ကို ဖတ်ပြီး FormData အဖြစ် ပြောင်းလဲခြင်း
        const body = await request.json();
        const formData = new FormData();

        // UI ကပို့သလိုမျိုး FormData ပုံစံ ပြန်ဖန်တီးခြင်း
        Object.entries(body).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                formData.append(key, String(value));
            }
        });

        // ၃။ UI ကသုံးတဲ့ createTicket Action ကို တိုက်ရိုက်ခေါ်သုံးခြင်း
        // options မှာ actorUserId အနေနဲ့ API ခေါ်သူရဲ့ ID ကို ပေးလိုက်ပါတယ်
        const result = await createTicket(formData, { actorUserId: userId });

        if ("error" in result) {
            return NextResponse.json({ success: false, error: result.error }, { status: 400 });
        }

        return NextResponse.json({ success: true, data: result.data }, { status: 201 });

    } catch (error) {
        console.error("[api-create-ticket-error]", error);
        return NextResponse.json({ success: false, error: "Failed to create ticket" }, { status: 500 });
    }
}