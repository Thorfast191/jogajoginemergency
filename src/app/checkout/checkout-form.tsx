"use client";

import { useActionState, useState } from "react";
import { useKeptForm } from "@/lib/use-kept-form";
import { createOrderAction, type CheckoutState } from "./actions";

const initial: CheckoutState = {};

const inputClass =
  "rounded-xl border border-black/15 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none";

export type Method = { id: string; label: string };

export function CheckoutForm({
  idempotencyKey,
  methods,
}: {
  idempotencyKey: string;
  methods: Method[];
}) {
  const [state, formAction, pending] = useActionState(createOrderAction, initial);
  const [formRef, submitForm] = useKeptForm(formAction, state);
  const [provider, setProvider] = useState(methods[0]?.id ?? "");

  return (
    <form ref={formRef} action={formAction} onSubmit={submitForm} className="space-y-6">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

      <fieldset className="rounded-2xl border border-black/10 bg-white p-4">
        <legend className="px-1 text-sm font-semibold">Pay with</legend>
        <div className="mt-1 grid gap-2">
          {methods.map((m) => (
            <label
              key={m.id}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${
                provider === m.id
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                  : "border-black/10 hover:bg-black/[0.02]"
              }`}
            >
              <input
                type="radio"
                name="provider"
                value={m.id}
                checked={provider === m.id}
                onChange={() => setProvider(m.id)}
              />
              <span className="font-medium">{m.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded-2xl border border-black/10 bg-white p-4">
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
        disabled={pending || methods.length === 0}
        className="w-full rounded-xl bg-[var(--color-primary)] px-4 py-3 font-semibold text-white transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:hover:scale-100"
      >
        {pending ? "Taking you to payment…" : "Continue to payment"}
      </button>
      <p className="text-center text-xs text-black/40">
        Your QR codes are made as soon as the payment goes through.
      </p>
    </form>
  );
}
