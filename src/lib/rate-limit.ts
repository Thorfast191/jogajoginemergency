// Rate limiting, with two backends.
//
// The default is an in-memory sliding window: exact, free, and correct for the
// single-process VPS this is built to run on. Setting RATE_LIMIT_STORE=postgres
// switches to shared fixed-window counters so several instances behind a load
// balancer share one budget — which matters because these limits now guard
// credentials, and per-process budgets would give an attacker N times the
// attempts.
//
// The Postgres backend is a fixed window rather than a sliding one: it costs a
// single upsert instead of a row per hit, at the price of allowing up to twice
// the limit across a window boundary. That trade is fine for throttling and
// wrong for anything that must be exact.

export type LimitOptions = { limit: number; windowMs: number };
export type LimitResult = { allowed: boolean; remaining: number };

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [key, bucket] of buckets) {
    if (bucket.timestamps.every((t) => t < cutoff)) buckets.delete(key);
  }
}, 5 * 60 * 1000).unref?.();

function usingPostgres(): boolean {
  return process.env.RATE_LIMIT_STORE === "postgres";
}

// Imported lazily so the in-memory path — the default, and the one on the scan
// hot path — never pulls in the database client at all.
async function db() {
  return (await import("@/lib/prisma")).prisma;
}

/** Drop hits that have aged out of the window, and return the live bucket. */
function live(key: string, windowMs: number, now: number): Bucket {
  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);
  buckets.set(key, bucket);
  return bucket;
}

function windowStart(windowMs: number, now: number): Date {
  return new Date(Math.floor(now / windowMs) * windowMs);
}

/**
 * Read the budget without spending any of it. Use this to decide whether to
 * *attempt* something whose cost should only be charged on failure — e.g. a
 * successful login must not consume a user's login budget.
 */
export async function checkLimit(key: string, opts: LimitOptions): Promise<LimitResult> {
  const { limit, windowMs } = opts;

  if (!usingPostgres()) {
    const used = live(key, windowMs, Date.now()).timestamps.length;
    return { allowed: used < limit, remaining: Math.max(0, limit - used) };
  }

  const row = await (await db()).rateLimitCounter.findUnique({
    where: { key_windowStart: { key, windowStart: windowStart(windowMs, Date.now()) } },
    select: { count: true },
  });
  const used = row?.count ?? 0;
  return { allowed: used < limit, remaining: Math.max(0, limit - used) };
}

/** Spend one unit of budget. Returns the state *after* the hit is recorded. */
export async function recordHit(key: string, opts: LimitOptions): Promise<LimitResult> {
  const { limit, windowMs } = opts;

  if (!usingPostgres()) {
    const now = Date.now();
    const bucket = live(key, windowMs, now);
    if (bucket.timestamps.length >= limit) return { allowed: false, remaining: 0 };
    bucket.timestamps.push(now);
    return { allowed: true, remaining: limit - bucket.timestamps.length };
  }

  // The upsert is atomic, so concurrent instances cannot both read the same
  // count and each decide they are under the limit.
  const start = windowStart(windowMs, Date.now());
  const row = await (await db()).rateLimitCounter.upsert({
    where: { key_windowStart: { key, windowStart: start } },
    create: { key, windowStart: start, count: 1 },
    update: { count: { increment: 1 } },
    select: { count: true },
  });

  if (row.count > limit) return { allowed: false, remaining: 0 };
  return { allowed: true, remaining: limit - row.count };
}

/**
 * Check and spend in one step — the right shape when every attempt costs,
 * regardless of outcome (scan logging, relay messages, abuse reports).
 */
export async function rateLimit(key: string, opts: LimitOptions): Promise<LimitResult> {
  return recordHit(key, opts);
}

/** Drop counter rows for windows that have long since passed. */
export async function pruneRateLimits(olderThanMs = 24 * 60 * 60 * 1000): Promise<number> {
  if (!usingPostgres()) return 0;
  const { count } = await (await db()).rateLimitCounter.deleteMany({
    where: { windowStart: { lt: new Date(Date.now() - olderThanMs) } },
  });
  return count;
}
