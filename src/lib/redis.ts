import Redis from "ioredis";
import { env } from "./env";

// Shared Redis connection for caching. BullMQ creates its own connections
// (see queue.ts) because it requires `maxRetriesPerRequest: null`.
const globalForRedis = globalThis as unknown as { redis?: Redis };

export const redis =
  globalForRedis.redis ??
  new Redis(env.redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
    enableOfflineQueue: true,
  });

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

/**
 * Cache-aside helper. Returns cached JSON if present, otherwise computes,
 * stores with a TTL, and returns. Fails open: if Redis is unavailable the
 * compute function is used directly so the app keeps working.
 */
export async function cached<T>(key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<T> {
  try {
    const hit = await redis.get(key);
    if (hit) return JSON.parse(hit) as T;
  } catch {
    return compute();
  }
  const value = await compute();
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    /* ignore cache write failures */
  }
  return value;
}
