"use client";

import { useActionState } from "react";
import { promoteToAdminAction, demoteAdminAction, type AdminsState } from "./actions";

const initial: AdminsState = {};

export function PromoteAdminForm() {
  const [state, action, pending] = useActionState<AdminsState, FormData>(
    promoteToAdminAction,
    initial,
  );

  return (
    <form action={action} className="max-w-md">
      <label className="block text-sm">
        Account email
        <div className="mt-1 flex gap-2">
          <input
            name="email"
            type="email"
            required
            placeholder="person@example.com"
            className="flex-1 rounded-md border border-black/15 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {pending ? "Promoting…" : "Make admin"}
          </button>
        </div>
        <span className="mt-1 block text-xs text-black/40">
          The person must already have a Jogajog account.
        </span>
      </label>

      {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="mt-2 text-sm text-emerald-600">{state.success}</p>}
    </form>
  );
}

export function DemoteAdminButton({ userId, isSelf }: { userId: string; isSelf: boolean }) {
  const [state, action, pending] = useActionState<AdminsState, FormData>(
    demoteAdminAction,
    initial,
  );

  if (isSelf) {
    return <span className="text-xs text-black/40">That&apos;s you</span>;
  }

  return (
    <form action={action} className="text-right">
      <input type="hidden" name="userId" value={userId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-black/15 px-3 py-1.5 text-xs font-medium hover:bg-black/5 disabled:opacity-60"
      >
        {pending ? "Removing…" : "Remove admin"}
      </button>
      {state.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
