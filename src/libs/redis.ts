import Redis from "ioredis";

declare global {
  var __ticketRedisClient: Redis | undefined;
}

const normalizeRedisUrl = (rawUrl?: string) => {
  if (!rawUrl) return "redis://127.0.0.1:6379";
  return rawUrl.replace(/^"(.*)"$/, "$1").trim();
};

const parsePositiveInt = (rawValue: string | undefined, fallback: number) => {
  if (!rawValue) return fallback;
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
};

export const REDIS_TIMEOUTS_MS = {
  connect: parsePositiveInt(process.env.REDIS_CONNECT_TIMEOUT_MS, 5_000),
  command: parsePositiveInt(process.env.REDIS_COMMAND_TIMEOUT_MS, 3_000),
  operation: parsePositiveInt(process.env.REDIS_OPERATION_TIMEOUT_MS, 4_000),
} as const;

const redisUrl = normalizeRedisUrl(process.env.REDIS_URL);

const redis =
  globalThis.__ticketRedisClient ??
  new Redis(redisUrl, {
    connectTimeout: REDIS_TIMEOUTS_MS.connect,
    commandTimeout: REDIS_TIMEOUTS_MS.command,
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
