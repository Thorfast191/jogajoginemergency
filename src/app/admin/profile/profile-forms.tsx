"use client";

import { useActionState } from "react";
import {
  updateAdminIdentityAction,
  updateAdminPasswordAction,
  type AdminProfileState,
} from "./actions";

const initial: AdminProfileState = {};
const field = "w-full rounded-md border border-black/15 px-3 py-2 text-sm";
const button =
  "rounded-md bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60";

export function AdminIdentityForm({ name, email }: { name: string; email: string }) {
  const [state, action, pending] = useActionState<AdminProfileState, FormData>(
    updateAdminIdentityAction,
    initial,
  );

  return (
    <form action={action} className="max-w-md space-y-3">
      <label className="block text-sm">
        Name
        <input name="name" defaultValue={name} required className={field} />
      </label>
      <label className="block text-sm">
        Email
        <input name="email" type="email" defaultValue={email} required className={field} />
        <span className="mt-1 block text-xs text-black/40">
          This is the address you sign in with.
        </span>
      </label>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">Saved.</p>}

      <button type="submit" disabled={pending} className={button}>
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

export function AdminPasswordForm() {
  const [state, action, pending] = useActionState<AdminProfileState, FormData>(
    updateAdminPasswordAction,
    initial,
  );

  return (
    <form action={action} className="max-w-md space-y-3">
      <label className="block text-sm">
        Current password
        <input
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          className={field}
        />
      </label>
      <label className="block text-sm">
        New password
        <input
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className={field}
        />
        <span className="mt-1 block text-xs text-black/40">
          At least 8 characters. Changing it signs you out everywhere else.
        </span>
      </label>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">Password changed.</p>}

      <button type="submit" disabled={pending} className={button}>
        {pending ? "Changing…" : "Change password"}
      </button>
    </form>
  );
}
