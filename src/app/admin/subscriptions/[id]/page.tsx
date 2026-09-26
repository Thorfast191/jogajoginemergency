import Link from "next/link";
import { notFound } from "next/navigation";
import { getStaffWith } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { formatPrice } from "@/lib/money";
import { daysLeft, intervalLabel, subscriptionBucket } from "@/lib/subscription-periods";
import { Forbidden } from "@/components/admin/forbidden";
import { BucketBadge } from "../bucket-badge";
import { CancelNowButton, ExtendForm } from "../subscription-controls";

export const dynamic = "force-dynamic";

// Kept out of the component body so the render stays free of impure calls.
function now(): Date {
  return new Date();
}

export default async function AdminSubscriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await getStaffWith("console.view");
  if (!admin) return <Forbidden />;
  const { id } = await params;

  const sub = await prisma.subscription.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      plan: true,
      // Includes the payment for an order that carried this plan — one payment
      // bought both, and settlement links it here too.
      payments: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { order: { select: { orderNumber: true, planPriceCents: true } } },
      },
    },
  });
  if (!sub) notFound();

  const at = now();
  const state = subscriptionBucket(sub, at);
  const left = daysLeft(sub.currentPeriodEnd, at);
  const seesMoney = can(admin.role, "money.manage");

  const facts: Array<[string, React.ReactNode]> = [
    [
      "Customer",
      <Link key="u" href={`/admin/users/${sub.user.id}`} className="text-[var(--color-primary-dark)] hover:underline">
        {sub.user.name} ({sub.user.email})
      </Link>,
    ],
    [
      "Plan",
      `${sub.plan.name} · ${formatPrice(sub.plan.priceCents, sub.plan.currency)} / ${intervalLabel(sub.plan.intervalMonths)}`,
    ],
    ["State", <BucketBadge key="b" bucket={state} complimentary={sub.status === "TRIALING"} />],
    ["Status column", sub.status],
    [
      "Runs until",
      sub.currentPeriodEnd.getTime() > 0
        ? `${sub.currentPeriodEnd.toLocaleString()}${left > 0 ? ` · ${left} days left` : ""}`
        : "Never paid",
    ],
    ["Gateway", sub.provider],
    ["Started", sub.createdAt.toLocaleDateString()],
  ];

  return (
    <div>
      <Link href="/admin/subscriptions" className="text-sm text-black/50 hover:underline">
        ← Subscriptions
      </Link>
      <h1 className="mt-2 text-2xl font-bold">
        {sub.user.name}&apos;s {sub.plan.name}
      </h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <dl className="h-fit divide-y divide-black/10 rounded-2xl border border-black/10 bg-white text-sm">
          {facts.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 px-4 py-2.5">
              <dt className="text-black/50">{label}</dt>
              <dd className="text-right">{value}</dd>
            </div>
          ))}
        </dl>

        {seesMoney ? (
          <div className="space-y-6">
            <section className="rounded-2xl border border-black/10 bg-white p-4">
              <h2 className="font-semibold">Add time</h2>
              <p className="mt-1 text-sm text-black/60">
                No payment is taken. Months are added to the current end date, or from today if it
                has already passed. A cancelled or lapsed subscription is reinstated.
              </p>
              <div className="mt-3">
                <ExtendForm subscriptionId={sub.id} />
              </div>
            </section>

            {state !== "cancelled" && state !== "expired" && (
              <section className="rounded-2xl border border-red-100 bg-white p-4">
                <h2 className="font-semibold">Cancel immediately</h2>
                <p className="mt-1 text-sm text-black/60">
                  For refunds, chargebacks or abuse. Their page stops showing their information at
                  once, unlike a customer&apos;s own cancel, which runs to the end of the period.
                </p>
                <div className="mt-3">
                  <CancelNowButton subscriptionId={sub.id} />
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-black/10 bg-white p-4">
              <h2 className="font-semibold">Payments</h2>
              {sub.payments.length === 0 ? (
                <p className="mt-2 text-sm text-black/50">No payments on this subscription.</p>
              ) : (
                <ul className="mt-2 divide-y divide-black/10 text-sm">
                  {sub.payments.map((p) => (
                    <li key={p.id} className="flex justify-between gap-3 py-2">
                      <span>
                        {formatPrice(
                          // Show the plan's share, not the whole basket, when the
                          // payment also covered stickers.
                          p.kind === "ORDER" && p.order?.planPriceCents !== null
                            ? (p.order?.planPriceCents ?? p.amountCents)
                            : p.amountCents,
                          p.currency,
                        )}{" "}
                        · {p.provider}
                        {p.order && (
                          <span className="text-black/40"> · with order {p.order.orderNumber}</span>
                        )}
                      </span>
                      <span className="text-black/50">
                        {p.status} · {p.createdAt.toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : (
          <p className="text-sm text-black/60">
            Extending, granting and cancelling subscriptions are for super admins.
          </p>
        )}
      </div>
    </div>
  );
}
