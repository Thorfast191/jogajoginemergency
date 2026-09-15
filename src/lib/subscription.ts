import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isEntitled, type SubStatus } from "@/lib/entitlements";
import { EXPIRING_WITHIN_DAYS, type Bucket } from "@/lib/subscription-periods";

// Server-side bridge between the Subscription table and the pure entitlement
// rules. Everything that needs to know "is this account paid up?" goes through
// here, so the definition of "paid up" lives in exactly one place.

const DAY_MS = 24 * 60 * 60 * 1000;
const ENTITLING: SubStatus[] = ["ACTIVE", "TRIALING"];

/**
 * Subscriptions that entitle right now.
 *
 * The period end is checked as well as the status: there is no renewal job, so
 * a row can sit at ACTIVE long after its period lapsed. Treating that as
 * entitled would publish a page nobody is paying for. Every count and list in
 * the console uses this, so they agree with what the scan page does.
 */
export function entitledWhere(now: Date): Prisma.SubscriptionWhereInput {
  return { status: { in: ENTITLING }, currentPeriodEnd: { gt: now } };
}

/** The database side of subscriptionBucket, for filtering the console list. */
export function bucketWhere(bucket: Bucket, now: Date): Prisma.SubscriptionWhereInput {
  const soon = new Date(now.getTime() + EXPIRING_WITHIN_DAYS * DAY_MS);
  switch (bucket) {
    case "active":
      return { status: { in: ENTITLING }, currentPeriodEnd: { gt: soon } };
    case "expiring":
      return { status: { in: ENTITLING }, currentPeriodEnd: { gt: now, lte: soon } };
    case "expired":
      return {
        OR: [{ status: { in: ENTITLING }, currentPeriodEnd: { lte: now } }, { status: "PAST_DUE" }],
      };
    case "cancelled":
      return { status: "CANCELED" };
  }
}

/** The status of the subscription that currently entitles this user, or null. */
export async function activeSubscriptionStatus(userId: string): Promise<SubStatus | null> {
  const sub = await prisma.subscription.findFirst({
    where: { userId, ...entitledWhere(new Date()) },
    orderBy: { currentPeriodEnd: "desc" },
    select: { status: true },
  });
  return sub?.status ?? null;
}

export async function userIsEntitled(userId: string): Promise<boolean> {
  return isEntitled(await activeSubscriptionStatus(userId));
}
