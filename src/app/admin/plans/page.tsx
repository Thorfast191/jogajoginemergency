import { getStaffWith } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { formatPrice } from "@/lib/money";
import { entitledWhere } from "@/lib/subscription";
import { intervalLabel } from "@/lib/subscription-periods";
import { Forbidden } from "@/components/admin/forbidden";
import { PlanForm } from "./plan-form";

export const dynamic = "force-dynamic";

// Kept out of the component body so the render stays free of impure calls.
function now(): Date {
  return new Date();
}

export default async function AdminPlansPage() {
  const admin = await getStaffWith("plans.edit");
  if (!admin) return <Forbidden />;
  const canPrice = can(admin.role, "pricing.manage");
  const at = now();

  const plans = await prisma.subscriptionPlan.findMany({
    orderBy: [{ isActive: "desc" }, { priceCents: "asc" }],
  });
  const subscribers = await Promise.all(
    plans.map((p) => prisma.subscription.count({ where: { planId: p.id, ...entitledWhere(at) } })),
  );

  return (
    <div>
      <h1 className="text-2xl font-bold">Plans</h1>
      <p className="mt-1 text-sm text-black/60">
        A plan is what publishes a customer&apos;s emergency page. Switching a plan off hides it
        from customers; people already on it keep the time they paid for.
      </p>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {plans.map((plan, i) => (
          <section key={plan.id} className="rounded-2xl border border-black/10 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold">{plan.name}</h2>
                <p className="text-sm text-black/60">
                  {formatPrice(plan.priceCents, plan.currency)} / {intervalLabel(plan.intervalMonths)}
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    plan.isActive ? "bg-emerald-100 text-emerald-800" : "bg-black/10 text-black/50"
                  }`}
                >
                  {plan.isActive ? "On" : "Off"}
                </span>
                <p className="mt-1 text-xs text-black/50">{subscribers[i]} active subscribers</p>
              </div>
            </div>
            <div className="mt-4 border-t border-black/10 pt-4">
              <PlanForm
                canPrice={canPrice}
                plan={{
                  id: plan.id,
                  slug: plan.slug,
                  name: plan.name,
                  priceCents: plan.priceCents,
                  intervalMonths: plan.intervalMonths,
                  features: plan.features,
                  isActive: plan.isActive,
                }}
              />
            </div>
          </section>
        ))}
        {plans.length === 0 && (
          <p className="text-sm text-black/50">No plans yet{canPrice ? " — create one below." : "."}</p>
        )}
      </div>

      {canPrice && (
        <section className="mt-10 max-w-2xl rounded-2xl border border-dashed border-black/15 bg-white p-5">
          <h2 className="font-semibold">New plan</h2>
          <div className="mt-3">
            <PlanForm canPrice />
          </div>
        </section>
      )}
    </div>
  );
}
