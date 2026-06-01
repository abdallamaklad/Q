import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

/**
 * Lightweight fixed-window rate limiter backed by Redis. Fails OPEN if Redis is
 * unavailable so the app never goes down because of the limiter.
 */
export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  limit: number;
  resetSeconds: number;
}

export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  try {
    const redisKey = `rl:${key}`;
    const count = await redis.incr(redisKey);
    if (count === 1) await redis.expire(redisKey, windowSeconds);
    const ttl = await redis.ttl(redisKey);
    return {
      ok: count <= limit,
      remaining: Math.max(0, limit - count),
      limit,
      resetSeconds: ttl < 0 ? windowSeconds : ttl,
    };
  } catch {
    return { ok: true, remaining: limit, limit, resetSeconds: windowSeconds };
  }
}

/**
 * Enforce a rate limit and return a 429 NextResponse when exceeded, or null to
 * continue. Usage in a route:
 *   const limited = await enforceRateLimit(`search:${ctx.userId}`, 60, 60);
 *   if (limited) return limited;
 */
export async function enforceRateLimit(key: string, limit: number, windowSeconds: number): Promise<NextResponse | null> {
  const r = await rateLimit(key, limit, windowSeconds);
  if (r.ok) return null;
  return NextResponse.json(
    { error: "Rate limit exceeded. Please slow down." },
    {
      status: 429,
      headers: {
        "Retry-After": String(r.resetSeconds),
        "X-RateLimit-Limit": String(r.limit),
        "X-RateLimit-Remaining": String(r.remaining),
      },
    }
  );
}
