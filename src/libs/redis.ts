import Redis from "ioredis";

declare global {
  var __ticketRedisClient: Redis | undefined;
}

const normalizeRedisUrl = (rawUrl?: string) => {
  if (!rawUrl) return "redis://127.0.0.1:6379";
  return rawUrl.replace(/^"(.*)"$/, "$1").trim();
};

const redisUrl = normalizeRedisUrl(process.env.REDIS_URL);

const redis =
  globalThis.__ticketRedisClient ??
  new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    enableAutoPipelining: true,
    lazyConnect: true,
  });

if (!globalThis.__ticketRedisClient) {
  // Redis client ကို process lifetime တစ်လျှောက် singleton ထားမှ
  // hot-reload/dev mode မှာ connection leak မဖြစ်ဘဲ stable ဖြစ်နေစေပါတယ်။
  globalThis.__ticketRedisClient = redis;
  redis.on("error", (error) => {
    console.warn("Redis error:", error);
  });
}

export default redis;
