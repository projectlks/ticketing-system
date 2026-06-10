// src/app/api/setup-token/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/libs/prisma";
import crypto from "crypto";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
        return NextResponse.json({ error: "Please provide a ?email= parameter" }, { status: 400 });
    }

    // Database ထဲက သက်ဆိုင်ရာ User ကို ရှာမည်
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ၁။ Token အစစ် (Plain Text) ဖန်တီးခြင်း
    const plainToken = `ewm_pat_${crypto.randomBytes(24).toString("hex")}`;

    // ၂။ SHA-256 ဖြင့် Hash ပြောင်းခြင်း
    const hashedToken = crypto.createHash("sha256").update(plainToken).digest("hex");

    // ၃။ Database ထဲတွင် Hash ကို သိမ်းခြင်း
    await prisma.user.update({
        where: { id: user.id },
        data: { apiToken: hashedToken }
    });

    return NextResponse.json({
        message: "Success! Copy the Plain Token below and use it in Postman or OTRS.",
        user: user.name,
        plainToken: plainToken, // 🌟 ဤ Token ကိုသာ Postman တွင် သုံးရမည်
        hashedTokenSavedInDB: hashedToken
    });
}