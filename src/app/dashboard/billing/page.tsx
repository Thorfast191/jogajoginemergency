import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PlanPicker } from "./plan-picker";

export default async function BillingPage() {
  const user = await getCustomer();
  if (!user) redirect("/login");

  const [subscription, plans, payments] = await Promise.all([
    prisma.subscription.findFirst({
      where: { userId: user.id, status: "ACTIVE" },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { priceCents: "asc" } }),
    prisma.payment.findMany({
      where: { subscription: { userId: user.id } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Billing</h1>
      <p className="mt-1 text-sm text-black/60">
        Payments run in demo mode for now — no real charge is made. A live Bangladesh payment
        gateway (SSLCommerz/bKash) will replace this soon.
      </p>

      <div className="mt-6">
        <PlanPicker plans={plans} currentSlug={subscription?.plan.slug} />
      </div>

      <div className="mt-10">
        <h2 className="font-semibold">Payment history</h2>
        {payments.length === 0 ? (
          <p className="mt-2 text-sm text-black/50">No payments yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-black/10 rounded-lg border border-black/10">
            {payments.map((p) => (
              <li key={p.id} className="p-3 text-sm flex justify-between">
                <span>
                  {p.currency} {(p.amountCents / 100).toLocaleString()} · {p.provider}
                </span>
                <span className="text-black/50">
                  {p.status} · {p.createdAt.toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
