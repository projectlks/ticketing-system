import redis from "@/libs/redis";

export async function clearAlertsCache() {
    try {
        let cursor = 0;
        do {
            const [nextCursor, keys] = await redis.scan(cursor, "MATCH", "tickets:unacknowledged:*", "COUNT", 100);
            cursor = Number(nextCursor);
            if (keys.length > 0) {
                await redis.del(keys);
            }
        } while (cursor !== 0);

        // await redis.del("tickets:unacknowledged");
        console.log("Alerts cache cleared");
    } catch (err) {
        console.warn("Redis unavailable:", err);
    }
}
