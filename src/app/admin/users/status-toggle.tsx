"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setUserStatusAction } from "../actions";

export function UserStatusToggle({ userId, status }: { userId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const next = status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              await setUserStatusAction(userId, next);
              router.refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Could not update.");
            }
          });
        }}
        disabled={pending}
        className="text-xs text-red-600 hover:underline disabled:opacity-60 text-left"
      >
        {pending ? "Updating…" : status === "ACTIVE" ? "Suspend" : "Reactivate"}
      </button>
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </div>
  );
}
