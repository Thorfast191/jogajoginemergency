"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setTagStatusAction } from "../actions";

const statuses = ["ACTIVE", "LOST", "DEACTIVATED"] as const;
type Status = (typeof statuses)[number];

function Select({
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
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // A code its owner switched off is theirs to switch on; a takedown is a
  // super admin's call, and so is lifting one. Either way a regular admin sees
  // the state with nothing to change it to, and taking down an owner-disabled
  // code happens on its detail page.
  if (status === "DEACTIVATED" && !takenDown) {
    return <span className="text-xs font-medium text-black/60">OFF (by owner)</span>;
  }
  if (status === "DEACTIVATED" && !canDeactivate) {
    return <span className="text-xs font-medium text-red-700">TAKEN DOWN</span>;
  }
  const options = canDeactivate ? statuses : statuses.filter((s) => s !== "DEACTIVATED");

  return (
    <div className="flex flex-col gap-1">
      <select
        value={value}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as Status;
          const prev = value;
          setValue(next);
          setError(null);
          startTransition(async () => {
            const result = await setTagStatusAction(tagId, next);
            if (result?.error) {
              setError(result.error);
              setValue(prev);
            } else {
              router.refresh();
            }
          });
        }}
        className="rounded-md border border-black/15 px-2 py-1 text-xs disabled:opacity-60"
      >
        {options.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      {error && <span className="text-[11px] text-red-600 max-w-[10rem]">{error}</span>}
    </div>
  );
}

export function TagStatusSelect({
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
  // Remount when the server-provided status changes so the control never
  // shows a stale value after a refresh.
  return (
    <Select
      key={`${status}:${takenDown}`}
      tagId={tagId}
      status={status}
      takenDown={takenDown}
      canDeactivate={canDeactivate}
    />
  );
}
