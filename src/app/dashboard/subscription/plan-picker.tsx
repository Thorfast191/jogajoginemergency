"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { changePlanAction } from "./actions";

type Plan = { slug: string; name: string; priceCents: number; currency: string; maxTags: number };

export function PlanPicker({ plans, currentSlug }: { plans: Plan[]; currentSlug?: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="grid sm:grid-cols-3 gap-4">
      {plans.map((plan) => {
        const isCurrent = plan.slug === currentSlug;
        return (
          <div
            key={plan.slug}
            className={`rounded-lg border p-4 ${isCurrent ? "border-emerald-600" : "border-black/10"}`}
          >
            <p className="font-medium">{plan.name}</p>
            <p className="text-sm text-black/60">
              {plan.currency} {(plan.priceCents / 100).toLocaleString()}/yr · {plan.maxTags} tags
            </p>
            <button
              disabled={isCurrent || pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await changePlanAction(plan.slug);
                  setError(result?.error ?? null);
                  if (!result?.error) router.refresh();
                })
              }
              className="mt-3 w-full rounded-md border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 disabled:opacity-50"
            >
              {isCurrent ? "Current plan" : "Switch to this plan"}
            </button>
          </div>
        );
      })}
      {error && <p className="sm:col-span-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
