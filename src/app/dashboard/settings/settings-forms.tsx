"use client";

import { useActionState } from "react";
import {
  updateProfileAction,
  updatePasswordAction,
  type ProfileState,
  type PasswordState,
} from "./actions";

export function ProfileForm({ name, phone }: { name: string; phone: string }) {
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(
    updateProfileAction,
    {}
  );

  return (
    <form action={formAction} className="space-y-3 max-w-sm">
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="name">
          Name
        </label>
        <input
          id="name"
          name="name"
          defaultValue={name}
          required
          className="w-full rounded-md border border-black/15 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="phone">
          Phone
        </label>
        <input
          id="phone"
          name="phone"
          defaultValue={phone}
          className="w-full rounded-md border border-black/15 px-3 py-2 text-sm"
        />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">Saved.</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}

export function PasswordForm() {
  const [state, formAction, pending] = useActionState<PasswordState, FormData>(
    updatePasswordAction,
    {}
  );

  return (
    <form action={formAction} className="space-y-3 max-w-sm">
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="currentPassword">
          Current password
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          className="w-full rounded-md border border-black/15 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="newPassword">
          New password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={8}
          className="w-full rounded-md border border-black/15 px-3 py-2 text-sm"
        />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">Password updated.</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/5 disabled:opacity-60"
      >
        {pending ? "Updating…" : "Change password"}
      </button>
    </form>
  );
}
