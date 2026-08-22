"use client";

import { useTransition } from "react";
import { setUserStatusAction } from "../actions";

export function UserStatusToggle({ userId, status }: { userId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const next = status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";

  return (
    <button
      onClick={() => startTransition(() => setUserStatusAction(userId, next))}
      disabled={pending}
      className="text-xs text-red-600 hover:underline disabled:opacity-60"
    >
      {pending ? "Updating…" : status === "ACTIVE" ? "Suspend" : "Reactivate"}
    </button>
  );
}
