"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setTagStatusAction } from "../actions";

const statuses = ["UNASSIGNED", "ACTIVE", "LOST", "DEACTIVATED"] as const;

function Select({ tagId, status }: { tagId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="flex flex-col gap-1">
      <select
        value={value}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as (typeof statuses)[number];
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
        {statuses.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      {error && <span className="text-[11px] text-red-600 max-w-[10rem]">{error}</span>}
    </div>
  );
}

export function TagStatusSelect({ tagId, status }: { tagId: string; status: string }) {
  // Remount when the server-provided status changes (e.g. after an assign /
  // unassign elsewhere on the page revalidates the data) so the control never
  // shows a stale value.
  return <Select key={status} tagId={tagId} status={status} />;
}
