export function writeSystemLog(category: string, message: string): void {
    // ၁။ မြန်မာစံတော်ချိန်ကို ယူပါမည်
    const currentTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Yangon" });

    // ၂။ Terminal (Console) တွင် Prisma လိုမျိုး လှလှပပလေး ထုတ်ပြပါမည်
    console.log(`[${currentTime}] [${category.toUpperCase()}] ${message}`);
}