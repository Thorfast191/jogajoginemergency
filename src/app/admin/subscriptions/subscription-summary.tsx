import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { daysLeft, subscriptionBucket } from "@/lib/subscription-periods";
import { BucketBadge } from "./bucket-badge";
import { ExtendForm, GrantForm } from "./subscription-controls";

// Kept out of the component body so the render stays free of impure calls.
function now(): Date {
  return new Date();
}

/**
 * A customer's subscription at a glance, for their admin user page — with the
 * money actions for super admins: extend an entitled subscription, or grant
 * free time to someone without one.
 */
export async function SubscriptionSummary({
  userId,
  canManageMoney,
}: {
  userId: string;
  canManageMoney: boolean;
}) {
  const [latest, plans] = await Promise.all([
    prisma.subscription.findFirst({
      where: { userId },
      orderBy: { currentPeriodEnd: "desc" },
      include: { plan: { select: { name: true } } },
    }),
    canManageMoney
      ? prisma.subscriptionPlan.findMany({
          where: { isActive: true },
          orderBy: { priceCents: "asc" },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  const at = now();
  const state = latest ? subscriptionBucket(latest, at) : null;
  const entitled = state === "active" || state === "expiring";

  return (
    <section className="mt-6 rounded-2xl border border-black/10 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xs font-medium uppercase tracking-wide text-black/40">Subscription</h2>
          {latest && state ? (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold">{latest.plan.name}</span>
              <BucketBadge bucket={state} complimentary={latest.status === "TRIALING"} />
              {latest.currentPeriodEnd.getTime() > 0 && (
                <span className="text-black/50">
                  until {latest.currentPeriodEnd.toLocaleDateString()}
                  {entitled ? ` · ${daysLeft(latest.currentPeriodEnd, at)} days left` : ""}
                </span>
              )}
            </p>
          ) : (
            <p className="mt-2 text-sm text-black/60">
              No subscription — their scan pages don&apos;t show their information.
            </p>
          )}
        </div>
        {latest && (
          <Link
            href={`/admin/subscriptions/${latest.id}`}
            className="text-sm font-medium text-[var(--color-primary-dark)] hover:underline"
          >
            Open subscription →
          </Link>
        )}
      </div>

      {canManageMoney && (
        <div className="mt-4 border-t border-black/10 pt-4">
          {entitled && latest ? (
            <>
              <p className="mb-2 text-sm text-black/60">Add time without a payment:</p>
              <ExtendForm subscriptionId={latest.id} />
            </>
          ) : (
            <>
              <p className="mb-2 text-sm text-black/60">Publish their page with complimentary time:</p>
              <GrantForm userId={userId} plans={plans} />
            </>
          )}
        </div>
      )}
    </section>
  );
}
