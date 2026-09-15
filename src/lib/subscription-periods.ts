// Subscription periods: how far a payment or a grant moves the end date, and
// which state a subscription is in for the console. Pure, and in UTC, so the
// arithmetic that decides whether someone's emergency page is published can be
// tested without a clock or a database.

export const BILLING_INTERVALS = [1, 6, 12] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

export type Bucket = "active" | "expiring" | "expired" | "cancelled";

/** A subscription ending within this many days is flagged as expiring. */
export const EXPIRING_WITHIN_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Calendar months later, clamped to the end of a shorter month — Jan 31 plus
 * one month is the last day of February, not early March.
 */
export function addMonths(date: Date, months: number): Date {
  const total = date.getUTCMonth() + Math.trunc(months);
  const year = date.getUTCFullYear() + Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(
    Date.UTC(
      year,
      month,
      Math.min(date.getUTCDate(), lastDay),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
}

/**
 * The new period end after adding `months`.
 *
 * Counted from the current end while it is still ahead, so renewing early
 * never costs the customer the days they already paid for; from today once it
 * has lapsed, so a late renewal doesn't pay for time that went unused.
 */
export function extendPeriod(periodEnd: Date, months: number, now: Date): Date {
  const from = periodEnd.getTime() > now.getTime() ? periodEnd : now;
  return addMonths(from, months);
}

/** Whole days until the period ends, rounded up; zero once it has. */
export function daysLeft(periodEnd: Date, now: Date): number {
  const ms = periodEnd.getTime() - now.getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / DAY_MS);
}

/**
 * Where a subscription sits in the console.
 *
 * "Expired" follows the entitlement rule rather than the status column: a row
 * still marked ACTIVE whose period has run out publishes nothing, and neither
 * does a PAST_DUE one — see src/lib/entitlements.ts.
 */
export function subscriptionBucket(
  s: { status: string; currentPeriodEnd: Date },
  now: Date,
): Bucket {
  if (s.status === "CANCELED") return "cancelled";
  const entitling = s.status === "ACTIVE" || s.status === "TRIALING";
  const remaining = s.currentPeriodEnd.getTime() - now.getTime();
  if (!entitling || remaining <= 0) return "expired";
  return remaining <= EXPIRING_WITHIN_DAYS * DAY_MS ? "expiring" : "active";
}

/** "month", "6 months", "year" — as in "৳499 / year". */
export function intervalLabel(months: number): string {
  if (months === 1) return "month";
  if (months === 12) return "year";
  return `${months} months`;
}
