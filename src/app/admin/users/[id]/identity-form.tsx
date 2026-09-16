"use client";

import { useActionState } from "react";
import { useKeptForm } from "@/lib/use-kept-form";
import { updateCustomerIdentityAction, type AdminActionState } from "@/app/admin/actions";

const initial: AdminActionState = {};
const field = "w-full rounded-md border border-black/15 px-3 py-2 text-sm";

/** Support-desk editing of a customer's name and sign-in email. */
export function CustomerIdentityForm({
  userId,
  name,
  email,
}: {
  userId: string;
  name: string;
  email: string;
}) {
  const action = updateCustomerIdentityAction.bind(null, userId);
  const [state, formAction, pending] = useActionState<AdminActionState, FormData>(action, initial);
  const [formRef, submitForm] = useKeptForm(formAction, state);

  return (
    <form ref={formRef} action={formAction} onSubmit={submitForm} className="max-w-md space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Name
          <input name="name" defaultValue={name} required className={field} />
        </label>
        <label className="text-sm">
          Email
          <input name="email" type="email" defaultValue={email} required className={field} />
        </label>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-emerald-600">Saved.</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save details"}
      </button>
    </form>
  );
}
