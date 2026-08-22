"use client";

import { useActionState } from "react";
import { signupAction, type SignupState } from "./actions";

type Plan = { id: string; slug: string; name: string; priceCents: number; currency: string };

const initialState: SignupState = {};

export function SignupForm({ plans, defaultPlanSlug }: { plans: Plan[]; defaultPlanSlug: string }) {
  const [state, formAction, pending] = useActionState(signupAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
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
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="planSlug">
          Plan
        </label>
        <select
          id="planSlug"
          name="planSlug"
          defaultValue={defaultPlanSlug}
          className="w-full rounded-md border border-black/15 px-3 py-2"
        >
          {plans.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name} — {p.currency} {(p.priceCents / 100).toLocaleString()}/yr
            </option>
          ))}
        </select>
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
        Payment runs in demo mode for now — no real charge is made.
      </p>
    </form>
  );
}
