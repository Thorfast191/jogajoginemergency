"use client";

import { useActionState } from "react";
import { useKeptForm } from "@/lib/use-kept-form";

export type ShippingValues = {
  shipName: string | null;
  shipPhone: string | null;
  shipAddress: string | null;
  shipCity: string | null;
  shipNote: string | null;
};

type State = { error?: string; ok?: boolean };

const initial: State = {};
const field = "w-full rounded-md border border-black/15 px-3 py-2 text-sm";

/**
 * Edit a delivery address.
 *
 * One form, two callers: the customer fixing their own typo before the parcel
 * leaves, and the console doing it for them over the phone. Both pass an action
 * already bound to an order id; each enforces its own rules about when an edit
 * is still allowed, which is why this takes the action rather than choosing one.
 */
export function ShippingForm({
  action,
  values,
  submitLabel = "Save address",
}: {
  action: (prev: State, formData: FormData) => Promise<State>;
  values: ShippingValues;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState<State, FormData>(action, initial);
  const [formRef, submitForm] = useKeptForm(formAction, state);

  return (
    <form ref={formRef} action={formAction} onSubmit={submitForm} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Name
          <input name="shipName" defaultValue={values.shipName ?? ""} className={field} />
        </label>
        <label className="text-sm">
          Phone
          <input name="shipPhone" defaultValue={values.shipPhone ?? ""} className={field} />
        </label>
        <label className="text-sm sm:col-span-2">
          Address
          <input name="shipAddress" defaultValue={values.shipAddress ?? ""} className={field} />
        </label>
        <label className="text-sm">
          City
          <input name="shipCity" defaultValue={values.shipCity ?? ""} className={field} />
        </label>
        <label className="text-sm">
          Delivery note
          <input name="shipNote" defaultValue={values.shipNote ?? ""} className={field} />
        </label>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-emerald-600">Saved.</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
