import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatPrice(cents: number, currency: string) {
  return `${currency} ${(cents / 100).toLocaleString()}/yr`;
}

export default async function PricingPage() {
  const plans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { priceCents: "asc" },
  });

  return (
    <div className="flex flex-col min-h-screen">
      <SiteNav />
      <main className="flex-1 mx-auto max-w-6xl px-4 py-16">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Simple, per-tag pricing</h1>
          <p className="mt-3 text-black/60">
            Every plan includes unlimited scans, masked-contact relay, and scan notifications.
          </p>
        </div>

        <div className="mt-12 grid sm:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <div
              key={plan.id}
              className={`rounded-xl border p-6 flex flex-col ${
                i === 1 ? "border-emerald-600 shadow-sm" : "border-black/10"
              }`}
            >
              {i === 1 && (
                <span className="text-xs font-medium text-emerald-600 mb-2">MOST POPULAR</span>
              )}
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className="mt-2 text-3xl font-bold">
                {formatPrice(plan.priceCents, plan.currency)}
              </p>
              <p className="mt-1 text-sm text-black/60">Up to {plan.maxTags} tags</p>
              <ul className="mt-6 space-y-2 text-sm flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-emerald-600">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={`/signup?plan=${plan.slug}`}
                className={`mt-6 rounded-md px-4 py-2 text-center font-medium ${
                  i === 1
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "border border-black/15 hover:bg-black/5"
                }`}
              >
                Choose {plan.name}
              </Link>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-black/40">
          Payments are currently processed in demo mode while we finalize our Bangladesh payment
          gateway integration (SSLCommerz / bKash). No real charge is made yet.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
