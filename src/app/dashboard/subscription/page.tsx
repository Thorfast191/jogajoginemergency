import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/money";
import { activeSubscriptionStatus } from "@/lib/subscription";
import { PageHeader, Badge, Card } from "@/components/ui";
import { MascotCheer, MascotThink } from "@/components/illustrations";
import { subscribeAction, cancelSubscriptionAction } from "./actions";
import { enabledGateways } from "@/lib/payments/enabled";
import { intervalLabel } from "@/lib/subscription-periods";
import { PaymentNotice } from "@/components/payment-notice";

export const dynamic = "force-dynamic";

const INCLUDED = [
  ["Your page goes live", "Every QR you have starts showing the information you chose to share."],
  ["Emergency details", "Blood group, allergies, medical notes and your emergency contacts."],
  ["Portfolio and scan history", "A short bio, your links, and the full scan history of every tag."],
];

const WITHOUT_IT = [
  "Your QR codes still scan, and still belong to you",
  "Finders can still message you through the anonymous relay",
  "Your information stays saved — it just isn't published",
  "You keep every sticker and QR you bought",
];

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string | string[] }>;
}) {
  const user = await getCustomer();
  if (!user) redirect("/login");

  const [subscription, plans, payments, status] = await Promise.all([
    prisma.subscription.findFirst({
      where: { userId: user.id },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { priceCents: "asc" } }),
    prisma.payment.findMany({
      where: { subscription: { userId: user.id } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    activeSubscriptionStatus(user.id),
  ]);

  const entitled = status !== null;
  const methods = (await enabledGateways()).map((g) => ({ id: g.id, label: g.label }));

  return (
    <div>
      <PageHeader
        title="Plus"
        subtitle="A subscription is what makes the page your QR codes open actually show your information."
      />

      <div className="mt-6 empty:hidden">
        <PaymentNotice code={(await searchParams).payment} />
      </div>

      <Card className="mt-6">
        <div className="flex items-start gap-4">
          {entitled ? (
            <MascotCheer className="h-14 w-14 shrink-0 text-[var(--color-primary)] anim-bob" />
          ) : (
            <MascotThink className="h-14 w-14 shrink-0 text-black/30" />
          )}
          <div className="flex-1">
            <p className="font-bold">
              {entitled ? "Your page is live" : "Your page isn't published"}{" "}
              {entitled && <Badge tone="grape">Active</Badge>}
            </p>
            {subscription && entitled ? (
              <p className="mt-1 text-sm text-black/60">
                {subscription.plan.name}
                {status === "TRIALING" ? " (complimentary)" : ""} · runs until{" "}
                {subscription.currentPeriodEnd.toLocaleDateString()}
              </p>
            ) : (
              <p className="mt-1 text-sm text-black/60">
Your QR codes scan, but they don&apos;t show your information yet.
              </p>
            )}
            {entitled && (
              <form action={cancelSubscriptionAction} className="mt-3">
                <button
                  type="submit"
                  className="rounded-lg border border-black/15 px-3 py-1.5 text-xs font-medium hover:bg-black/5"
                >
                  Cancel subscription
                </button>
              </form>
            )}
          </div>
        </div>
      </Card>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="font-bold">What a subscription gives you</h2>
          <ul className="mt-3 space-y-3">
            {INCLUDED.map(([title, body]) => (
              <li key={title} className="rounded-xl border border-black/10 bg-white p-3">
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-0.5 text-sm text-black/60">{body}</p>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-bold">Without one</h2>
          <ul className="mt-3 space-y-2 rounded-xl border border-black/10 bg-black/[0.02] p-4">
            {WITHOUT_IT.map((f) => (
              <li key={f} className="flex gap-2 text-sm text-black/70">
                <span aria-hidden>✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-black/50">
If it lapses, your page goes quiet but the relay stays open, so a lost item can
            still find its way back to you.
          </p>
        </div>
      </div>

      {plans.length > 0 && (
        <div className="mt-10">
          <h2 className="font-bold">{entitled ? "Change plan" : "Choose a plan"}</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {plans.map((plan) => {
              const current = entitled && subscription?.planId === plan.id;
              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl border-2 bg-white p-5 ${
                    current ? "border-[var(--color-primary)]" : "border-black/10"
                  }`}
                >
                  <p className="font-bold">{plan.name}</p>
                  <p className="mt-1 text-2xl font-bold">
                    {formatPrice(plan.priceCents, plan.currency)}
                    <span className="text-sm font-normal text-black/40">
                      {" "}
                      / {intervalLabel(plan.intervalMonths)}
                    </span>
                  </p>
                  {plan.features.length > 0 && (
                    <ul className="mt-3 space-y-1 text-sm text-black/60">
                      {plan.features.map((f) => (
                        <li key={f}>· {f}</li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-4 grid gap-2">
                    {methods.map((m) => (
                      <form action={subscribeAction} key={m.id}>
                        <input type="hidden" name="planSlug" value={plan.slug} />
                        <input type="hidden" name="provider" value={m.id} />
                        <button
                          type="submit"
                          className="w-full rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
                        >
                          {current ? "Renew" : "Subscribe"} with {m.label}
                        </button>
                      </form>
                    ))}
                    {methods.length === 0 && (
                      <p className="text-sm text-black/50">
                        No payment method is configured on this deployment yet.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-black/40">
You&apos;ll be taken to your chosen provider to pay.
          </p>
        </div>
      )}

      <div className="mt-10">
        <h2 className="font-bold">Payment history</h2>
        {payments.length === 0 ? (
          <p className="mt-2 text-sm text-black/50">No payments yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-black/10 rounded-xl border border-black/10 bg-white">
            {payments.map((p) => (
              <li key={p.id} className="flex justify-between p-3 text-sm">
                <span>
                  {formatPrice(p.amountCents, p.currency)} · {p.provider}
                </span>
                <span className="text-black/50">
                  {p.status} · {p.createdAt.toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-8 text-sm text-black/50">
        Looking for your tags?{" "}
        <Link href="/dashboard/tags" className="font-medium text-[var(--color-primary)] hover:underline">
          My Tags
        </Link>
      </p>
    </div>
  );
}
