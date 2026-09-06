// In-memory sliding-window rate limiter.
//
// This is intentionally simple: it only works correctly for a single Node
// process. It's sufficient for a single-VPS deployment, but if this app is
// ever scaled to multiple instances behind a load balancer, swap this for a
// shared store (Redis/Postgres) keyed the same way.

type Bucket = { timestamps: number[] };

export type LimitOptions = { limit: number; windowMs: number };
export type LimitResult = { allowed: boolean; remaining: number };

const buckets = new Map<string, Bucket>();

// Periodically drop buckets with no recent activity so memory doesn't grow
// unbounded on a long-running process.
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [key, bucket] of buckets) {
    if (bucket.timestamps.every((t) => t < cutoff)) buckets.delete(key);
  }
}, 5 * 60 * 1000).unref?.();

/** Drop hits that have aged out of the window, and return the live bucket. */
function live(key: string, windowMs: number, now: number): Bucket {
  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);
  buckets.set(key, bucket);
  return bucket;
}

/**
 * Read the budget without spending any of it. Use this to decide whether to
 * *attempt* something whose cost should only be charged on failure — e.g. a
 * successful login must not consume a user's login budget.
 */
export function checkLimit(key: string, { limit, windowMs }: LimitOptions): LimitResult {
  const used = live(key, windowMs, Date.now()).timestamps.length;
  return { allowed: used < limit, remaining: Math.max(0, limit - used) };
}

/** Spend one unit of budget. Returns the state *after* the hit is recorded. */
export function recordHit(key: string, { limit, windowMs }: LimitOptions): LimitResult {
  const now = Date.now();
  const bucket = live(key, windowMs, now);

  if (bucket.timestamps.length >= limit) return { allowed: false, remaining: 0 };

  bucket.timestamps.push(now);
  return { allowed: true, remaining: limit - bucket.timestamps.length };
}

/**
 * Check and spend in one step — the right shape when every attempt costs,
 * regardless of outcome (scan logging, relay messages, abuse reports).
 */
export function rateLimit(key: string, opts: LimitOptions): LimitResult {
  return recordHit(key, opts);
}
