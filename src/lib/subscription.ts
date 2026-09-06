import { prisma } from "@/lib/prisma";
import {
  entitlementsFor,
  isEntitled,
  type Entitlements,
  type SubStatus,
} from "@/lib/entitlements";

// Server-side bridge between the Subscription table and the pure entitlement
// rules. Everything that needs to know "is this account paid up?" goes through
// here, so the definition of "paid up" lives in exactly one place.

/**
 * The status of the subscription that currently entitles this user, or null.
 *
 * The period end is checked as well as the status: payments run through a DEMO
 * provider with no renewal job, so a row can sit at ACTIVE long after its
 * period lapsed. Treating that as entitled would give away the paid tier.
 */
export async function activeSubscriptionStatus(userId: string): Promise<SubStatus | null> {
  const sub = await prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ["ACTIVE", "TRIALING"] },
      currentPeriodEnd: { gt: new Date() },
    },
    orderBy: { currentPeriodEnd: "desc" },
    select: { status: true },
  });
  return sub?.status ?? null;
}

export async function entitlementsForUser(userId: string): Promise<Entitlements> {
  return entitlementsFor(await activeSubscriptionStatus(userId));
}

export async function userIsEntitled(userId: string): Promise<boolean> {
  return isEntitled(await activeSubscriptionStatus(userId));
}
