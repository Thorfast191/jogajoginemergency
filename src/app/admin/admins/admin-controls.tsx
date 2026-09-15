"use client";

import { useActionState } from "react";
import { promoteAction, setRoleAction, type AdminsState } from "./actions";

const initial: AdminsState = {};

const field = "rounded-lg border border-black/15 bg-white px-3 py-2 text-sm";

export function PromoteAdminForm() {
  const [state, action, pending] = useActionState<AdminsState, FormData>(promoteAction, initial);

  return (
    <form action={action} className="max-w-xl">
      <div className="flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="promote-email">
          Account email
        </label>
        <input
          id="promote-email"
          name="email"
          type="email"
          required
          placeholder="person@example.com"
          className={`${field} min-w-0 flex-1`}
        />
        <label className="sr-only" htmlFor="promote-role">
          Role
        </label>
        <select id="promote-role" name="role" defaultValue="ADMIN" className={field}>
          <option value="ADMIN">Admin</option>
          <option value="SUPER_ADMIN">Super admin</option>
        </select>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : "Give access"}
        </button>
      </div>
      <p className="mt-1 text-xs text-black/40">The person must already have a Jogajog account.</p>

      {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="mt-2 text-sm text-[var(--color-primary-dark)]">{state.success}</p>}
    </form>
  );
}

export function RoleControl({
  userId,
  role,
  isSelf,
}: {
  userId: string;
  role: string;
  isSelf: boolean;
}) {
  const [state, action, pending] = useActionState<AdminsState, FormData>(setRoleAction, initial);

  if (isSelf) {
    return <span className="text-xs text-black/40">That&apos;s you</span>;
  }

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="userId" value={userId} />
      <div className="flex gap-2">
        <select name="role" defaultValue={role} className={`${field} py-1.5 text-xs`} aria-label="Role">
          <option value="SUPER_ADMIN">Super admin</option>
          <option value="ADMIN">Admin</option>
          <option value="USER">Remove admin access</option>
        </select>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-black/15 px-3 py-1.5 text-xs font-medium hover:bg-black/5 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state.success && <p className="text-xs text-[var(--color-primary-dark)]">{state.success}</p>}
    </form>
  );
}
