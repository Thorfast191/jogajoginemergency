"use client";

import { useActionState } from "react";
import { createOrderAction, type CheckoutState } from "./actions";

const initial: CheckoutState = {};

const inputClass =
  "rounded-xl border border-black/15 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none";

export function CheckoutForm({ idempotencyKey }: { idempotencyKey: string }) {
  const [state, formAction, pending] = useActionState(createOrderAction, initial);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

      <fieldset className="rounded-2xl border border-black/10 bg-white p-4 space-y-3">
        <legend className="px-1 text-sm font-semibold">Shipping (optional)</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <input name="shipName" placeholder="Name" className={inputClass} />
          <input name="shipPhone" placeholder="Phone" className={inputClass} />
          <input name="shipAddress" placeholder="Address" className={`${inputClass} sm:col-span-2`} />
          <input name="shipCity" placeholder="City" className={inputClass} />
          <input name="shipNote" placeholder="Delivery note" className={`${inputClass} sm:col-span-2`} />
        </div>
      </fieldset>

      {state.error && <p className="text-sm font-medium text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-[var(--color-primary)] px-4 py-3 font-semibold text-white transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:hover:scale-100"
      >
        {pending ? "Placing order…" : "Pay (demo)"}
      </button>
      <p className="text-center text-xs text-black/40">
        Payments run in demo mode — no real charge is made. Your tags activate immediately.
      </p>
    </form>
  );
}
