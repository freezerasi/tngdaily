import "server-only";

/**
 * Fixed-window rate limiter.
 *
 * In-memory, so it is per serverless instance. That is enough to blunt casual
 * abuse of the public endpoints; the contribution route pairs it with a
 * database count keyed on a hashed submitter so a burst spread across instances
 * is still caught. For production scale, swap the store for Upstash Redis:
 * the interface below is the only thing callers depend on.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

function sweep(now: number): void {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return {
    ok: true,
    remaining: limit - existing.count,
    retryAfterSeconds: 0,
  };
}

export const RATE_LIMITS = {
  reactions: { limit: 60, windowMs: 60_000 },
  contributions: { limit: 3, windowMs: 60 * 60 * 1000 },
  contributionUploads: { limit: 8, windowMs: 60 * 60 * 1000 },
  imageSearch: { limit: 40, windowMs: 60_000 },
  aiGenerate: { limit: 30, windowMs: 60_000 },
  extract: { limit: 20, windowMs: 60_000 },
} as const;

export function tooManyRequests(result: RateLimitResult, message: string): Response {
  return Response.json(
    { error: message, retryAfter: result.retryAfterSeconds },
    {
      status: 429,
      headers: { "Retry-After": String(result.retryAfterSeconds) },
    },
  );
}
