"use server";

import { writeSystemLog } from "@/libs/logger";

export async function logClientError(errorMessage: string, stackTrace?: string) {
    // Client-side က Error ကို Server ရဲ့ Terminal (journalctl) ဆီသို့ တိုက်ရိုက် လှမ်းပို့ပေးပါမည်
    writeSystemLog("UI_ERROR", `[UI_CRASH] Frontend rendering error occurred: ${errorMessage} | Stack: ${stackTrace || "N/A"}`);
}