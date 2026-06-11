// src/libs/basic-auth.ts
import { type NextRequest } from "next/server";
import { prisma } from "@/libs/prisma";
import bcrypt from "bcrypt"; // သို့မဟုတ် အစ်ကိုသုံးထားသော bcrypt package
import crypto from "node:crypto";
import redis from "./redis";



export async function getUserIdFromBasicAuth(request: NextRequest): Promise<string | null> {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Basic ")) return null;

    try {
        // Header ထဲမှ Email နှင့် Password ကို ဖြည်ထုတ်ခြင်း
        const base64Credentials = authHeader.split(" ")[1];
        if (!base64Credentials) return null;

        const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
        const [email, password] = credentials.split(":");
        if (!email || !password) return null;

        // 🌟 [အဓိကလှည့်ကွက်] Email နဲ့ Password အတွဲလိုက်ကို SHA-256 နဲ့ Hash လုပ်ပြီး Redis Key ဆောက်ပါမည်
        // ဒါမှ Password အစစ်လည်း မပေါက်ကြားတော့သလို၊ ခေါ်တိုင်း DB သို့ သွားမစစ်တော့ပါဘူး
        const credentialHash = crypto.createHash("sha256").update(`${email}:${password}`).digest("hex");
        const cacheKey = `basic_auth:${credentialHash}`;

        // ၁။ Redis Cache ထဲတွင် အရင်စစ်မည် (Cache Hit)
        const cachedUserId = await redis.get(cacheKey);
        if (cachedUserId) {
            return String(cachedUserId); // 🌟 Database ဆီ မသွားတော့ဘဲ ချက်ချင်း လက်ခံမည်
        }

        // ၂။ Cache ထဲတွင် မရှိမှသာ Database တွင် ရှာဖွေမည် (Cache Miss)
        const user = await prisma.user.findUnique({
            where: { email: email.trim().toLowerCase() },
        });

        if (user && !user.isArchived && user.password) {
            // ၃။ Bcrypt ဖြင့် Password မှန်/မမှန် စစ်ဆေးမည်
            const isPasswordValid = await bcrypt.compare(password, user.password);

            if (isPasswordValid) {
                // စစ်ဆေးမှု အောင်မြင်ပါက Redis ထဲတွင် (၁) နာရီ စိတ်ချရအောင် မှတ်ထားမည်
                try {
                    await redis.set(cacheKey, user.id, "EX", 3600);
                } catch (cacheError) {
                    console.warn("[Redis Set Error]:", cacheError);
                }

                return user.id;
            }
        }

        return null;
    } catch (error) {
        console.error("[Basic Auth Error]:", error);
        return null;
    }
}