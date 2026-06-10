import { type NextRequest } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/libs/prisma";

/**
 * Header ထဲမှ Basic Auth (Email:Password) ကို ဖတ်ပြီး User ကို ရှာပေးသည့် Shared Function
 */
export async function getUserIdFromBasicAuth(request: NextRequest): Promise<string | null> {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Basic ")) return null;

    try {
        const base64Credentials = authHeader.split(" ")[1];
        const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
        const [email, password] = credentials.split(":");

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
            where: { email: email.trim().toLowerCase() },
        });

        if (!user || user.isArchived || !user.password) return null;

        const isValid = await bcrypt.compare(password, user.password);
        return isValid ? user.id : null;
    } catch (error) {
        console.error("[basic-auth-error]", error);
        return null;
    }
}