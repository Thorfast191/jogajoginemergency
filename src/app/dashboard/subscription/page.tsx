import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/money";
import { activeSubscriptionStatus } from "@/lib/subscription";
import { PageHeader, Badge, Card } from "@/components/ui";
import { MascotCheer, MascotThink } from "@/components/illustrations";
import { subscribeAction, cancelSubscriptionAction } from "./actions";

export const dynamic = "force-dynamic";

const PLUS_FEATURES = [
  ["Portfolio on your scan page", "Add a short bio and links — socials, website, anything."],
  ["Premium themes", "Re-skin any tag with the full theme collection."],
  ["Full scan history", "Every scan, not just the last five."],
];

const ALWAYS_FREE = [
  "Your emergency profile and every medical field",
  "Emergency contacts and the masked message relay",
  "Free themes on every tag",
  "Marking a tag lost, and per-field privacy controls",
];

export default async function SubscriptionPage() {
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

  return (
    <div>
      <PageHeader
        title="Plus"
        subtitle="Optional. Your emergency information is free forever, with or without it."
      />

      <Card className="mt-6">
        <div className="flex items-start gap-4">
          {entitled ? (
            <MascotCheer className="h-14 w-14 shrink-0 text-[var(--color-primary)] anim-bob" />
          ) : (
            <MascotThink className="h-14 w-14 shrink-0 text-black/30" />
          )}
          <div className="flex-1">
            <p className="font-bold">
              {entitled ? "You're on Plus" : "You're on the free plan"}{" "}
              {entitled && <Badge tone="grape">Active</Badge>}
            </p>
            {subscription && entitled ? (
              <p className="mt-1 text-sm text-black/60">
                {subscription.plan.name} · renews {subscription.currentPeriodEnd.toLocaleDateString()}
              </p>
            ) : (
              <p className="mt-1 text-sm text-black/60">
                Everything safety-critical already works. Plus adds the extras below.
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
          <h2 className="font-bold">What Plus adds</h2>
          <ul className="mt-3 space-y-3">
            {PLUS_FEATURES.map(([title, body]) => (
              <li key={title} className="rounded-xl border border-black/10 bg-white p-3">
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-0.5 text-sm text-black/60">{body}</p>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-bold">Always free</h2>
          <ul className="mt-3 space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
            {ALWAYS_FREE.map((f) => (
              <li key={f} className="flex gap-2 text-sm text-emerald-900">
                <span aria-hidden>✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-black/50">
            If your subscription lapses, a first responder still sees your blood group, allergies
            and emergency contacts. That never sits behind a paywall.
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
                    <span className="text-sm font-normal text-black/40"> / year</span>
                  </p>
                  {plan.features.length > 0 && (
                    <ul className="mt-3 space-y-1 text-sm text-black/60">
                      {plan.features.map((f) => (
                        <li key={f}>· {f}</li>
                      ))}
                    </ul>
                  )}
                  <form action={subscribeAction} className="mt-4">
                    <input type="hidden" name="planSlug" value={plan.slug} />
                    <button
                      type="submit"
                      className="w-full rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
                    >
                      {current ? "Renew" : entitled ? "Switch" : "Subscribe (demo)"}
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-black/40">
            Payments run in demo mode — no real charge is made.
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
