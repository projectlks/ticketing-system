import { createHash } from "crypto";

import redis from "./redis";

type CacheLoader<T> = () => Promise<T>;

const safeJsonParse = <T>(value: string): T | null => {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const toStableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => toStableValue(entry));
  }

  if (value && typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    return Object.keys(objectValue)
      .sort()
      .reduce<Record<string, unknown>>((accumulator, key) => {
        accumulator[key] = toStableValue(objectValue[key]);
        return accumulator;
      }, {});
  }

  return value;
};

export const stableSerialize = (value: unknown) =>
  JSON.stringify(toStableValue(value));

export const hashKeyPayload = (value: unknown) =>
  createHash("sha1").update(stableSerialize(value)).digest("hex");

export async function getOrSetCache<T>(
  key: string,
  ttlSeconds: number,
  loader: CacheLoader<T>,
): Promise<T> {
  try {
    const cached = await redis.get(key);
    if (cached) {
      const parsed = safeJsonParse<T>(cached);
      if (parsed !== null) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn(`Redis read failed for key "${key}"`, error);
  }

  const fresh = await loader();

  try {
    await redis.set(key, JSON.stringify(fresh), "EX", ttlSeconds);
  } catch (error) {
    console.warn(`Redis write failed for key "${key}"`, error);
  }

  return fresh;
}

export async function invalidateCacheByPrefix(prefix: string): Promise<void> {
  try {
    let cursor = "0";

    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        "MATCH",
        `${prefix}*`,
        "COUNT",
        200,
      );

      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(keys);
      }
    } while (cursor !== "0");
  } catch (error) {
    console.warn(`Redis prefix invalidation failed for "${prefix}"`, error);
  }
}

export async function invalidateCacheByPrefixes(
  prefixes: string[],
): Promise<void> {
  // Prefix အများကြီး invalidate လုပ်ရတဲ့ mutation flow တွေမှာ parallel run လုပ်ထားမှ
  // post-mutation latency ကိုလျှော့နိုင်ပါတယ်။
  await Promise.all(prefixes.map((prefix) => invalidateCacheByPrefix(prefix)));
}
