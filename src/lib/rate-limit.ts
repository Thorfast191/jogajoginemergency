// In-memory sliding-window rate limiter.
//
// This is intentionally simple: it only works correctly for a single Node
// process. It's sufficient for a single-VPS deployment, but if this app is
// ever scaled to multiple instances behind a load balancer, swap this for a
// shared store (Redis/Postgres) keyed the same way.

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

// Periodically drop buckets with no recent activity so memory doesn't grow
// unbounded on a long-running process.
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [key, bucket] of buckets) {
    if (bucket.timestamps.every((t) => t < cutoff)) buckets.delete(key);
  }
}, 5 * 60 * 1000).unref?.();

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);

  if (bucket.timestamps.length >= limit) {
    buckets.set(key, bucket);
    return { allowed: false, remaining: 0 };
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return { allowed: true, remaining: limit - bucket.timestamps.length };
}
