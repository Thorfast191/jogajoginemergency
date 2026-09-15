"use client";

import { useActionState } from "react";
import { createPlanAction, updatePlanAction, type PlanState } from "./actions";

const initial: PlanState = {};

type Plan = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  intervalMonths: number;
  features: string[];
  isActive: boolean;
};

const field = "mt-1 w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm";

export function PlanForm({ plan, canPrice }: { plan?: Plan; canPrice: boolean }) {
  const action = plan ? updatePlanAction.bind(null, plan.id) : createPlanAction;
  const [state, formAction, pending] = useActionState<PlanState, FormData>(action, initial);

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {plan ? (
          <p className="text-sm">
            <span className="block text-xs font-medium text-black/50">Slug</span>
            <span className="mt-1 block font-mono">{plan.slug}</span>
          </p>
        ) : (
          <label className="text-sm">
            Slug
            <input name="slug" required placeholder="plus" className={field} />
          </label>
        )}
        <label className="text-sm">
          Name
          <input name="name" required defaultValue={plan?.name} className={field} />
        </label>
      </div>

      <label className="block text-sm">
        Features <span className="text-black/40">(one per line, up to 8)</span>
        <textarea
          name="features"
          rows={4}
          defaultValue={plan?.features.join("\n")}
          className={field}
        />
      </label>

      {canPrice ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            Price (paisa)
            <input
              name="priceCents"
              type="number"
              min={0}
              required
              defaultValue={plan?.priceCents ?? 49900}
              className={field}
            />
          </label>
          <label className="text-sm">
            Billing
            <select name="intervalMonths" defaultValue={plan?.intervalMonths ?? 12} className={field}>
              <option value={1}>Monthly</option>
              <option value={6}>Every 6 months</option>
              <option value={12}>Yearly</option>
            </select>
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked={plan?.isActive ?? true} className="h-4 w-4" />
            Customers can choose it
          </label>
        </div>
      ) : (
        <p className="rounded-lg bg-black/[0.03] px-3 py-2 text-xs text-black/60">
          Price, billing period and availability are set by a super admin.
        </p>
      )}

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-[var(--color-primary-dark)]">Saved.</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : plan ? "Save plan" : "Create plan"}
      </button>
    </form>
  );
}
