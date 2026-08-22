"use client";

import { useTransition } from "react";
import { setTagStatusAction } from "../actions";

const statuses = ["UNASSIGNED", "ACTIVE", "LOST", "DEACTIVATED"] as const;

export function TagStatusSelect({ tagId, status }: { tagId: string; status: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={status}
      disabled={pending}
      onChange={(e) =>
        startTransition(() =>
          setTagStatusAction(tagId, e.target.value as (typeof statuses)[number])
        )
      }
      className="rounded-md border border-black/15 px-2 py-1 text-xs disabled:opacity-60"
    >
      {statuses.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
