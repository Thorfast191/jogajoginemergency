"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setTagStatusAction } from "../../actions";

type Status = "ACTIVE" | "LOST" | "DEACTIVATED";

const ACTIONS: Array<{ next: Status; label: string; hint: string }> = [
  { next: "ACTIVE", label: "Mark active", hint: "Scan page shows the owner's information again." },
  { next: "LOST", label: "Mark lost", hint: "Scan page shows a 'help return this' banner." },
  {
    next: "DEACTIVATED",
    label: "Deactivate",
    hint: "Scan page 404s. Use for abuse takedowns.",
  },
];

export function TagAdminControls({
  tagId,
  status,
  canDeactivate,
}: {
  tagId: string;
  status: string;
  canDeactivate: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const run = (next: Status) => {
    setError(null);
    start(async () => {
      const res = await setTagStatusAction(tagId, next);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  };

  if (status === "DEACTIVATED" && !canDeactivate) {
    return (
      <p className="text-sm text-black/60">
        This QR code was taken down. Only a super admin can reactivate it.
      </p>
    );
  }

  const actions = canDeactivate ? ACTIONS : ACTIONS.filter((a) => a.next !== "DEACTIVATED");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <button
            key={a.next}
            onClick={() => run(a.next)}
            disabled={pending || status === a.next}
            title={a.hint}
            className="rounded-md border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 disabled:opacity-40"
          >
            {a.label}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
