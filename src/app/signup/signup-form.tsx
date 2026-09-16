"use client";

import { useActionState } from "react";
import { useKeptForm } from "@/lib/use-kept-form";
import { signupAction, type SignupState } from "./actions";

const initialState: SignupState = {};

export function SignupForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(signupAction, initialState);
  const [formRef, submitForm] = useKeptForm(formAction, state);

  return (
    <form ref={formRef} action={formAction} onSubmit={submitForm} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="name">
          Full name
        </label>
        <input
          id="name"
          name="name"
          required
          className="w-full rounded-md border border-black/15 px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full rounded-md border border-black/15 px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="phone">
          Phone (used only for account contact, never shown publicly)
        </label>
        <input
          id="phone"
          name="phone"
          className="w-full rounded-md border border-black/15 px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          className="w-full rounded-md border border-black/15 px-3 py-2"
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-emerald-600 text-white px-4 py-2 font-medium hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>

      <p className="text-xs text-black/40 text-center">
        Your account is free. You only pay when you buy a sticker.
      </p>
    </form>
  );
}
