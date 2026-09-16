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
  takenDown,
  canDeactivate,
}: {
  tagId: string;
  status: string;
  takenDown: boolean;
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

  const button =
    "rounded-md border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 disabled:opacity-40";
  const errorLine = error && <p className="text-sm text-red-600">{error}</p>;

  // Switched off by its owner: theirs to switch back on. A super admin can
  // still make it a takedown, so the owner can't bring it back.
  if (status === "DEACTIVATED" && !takenDown) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-black/60">The owner turned this QR code off.</p>
        {canDeactivate && (
          <div>
            <button onClick={() => run("DEACTIVATED")} disabled={pending} className={button}>
              Take down
            </button>
          </div>
        )}
        {errorLine}
      </div>
    );
  }

  if (status === "DEACTIVATED" && !canDeactivate) {
    return (
      <p className="text-sm text-black/60">
        This QR code was taken down. Only a super admin can lift the takedown.
      </p>
    );
  }

  const actions =
    status === "DEACTIVATED"
      ? [
          { next: "ACTIVE" as const, label: "Lift takedown (active)", hint: ACTIONS[0].hint },
          { next: "LOST" as const, label: "Lift takedown (lost)", hint: ACTIONS[1].hint },
        ]
      : canDeactivate
        ? ACTIONS.map((a) => (a.next === "DEACTIVATED" ? { ...a, label: "Take down" } : a))
        : ACTIONS.filter((a) => a.next !== "DEACTIVATED");

  return (
    <div className="flex flex-col gap-2">
      {status === "DEACTIVATED" && (
        <p className="text-sm text-black/60">Taken down by staff. The owner can&apos;t switch it back on.</p>
      )}
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <button
            key={a.next}
            onClick={() => run(a.next)}
            disabled={pending || status === a.next}
            title={a.hint}
            className={button}
          >
            {a.label}
          </button>
        ))}
      </div>
      {errorLine}
    </div>
  );
}
