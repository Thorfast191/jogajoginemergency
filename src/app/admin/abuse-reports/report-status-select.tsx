"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resolveAbuseReportAction } from "../actions";

const statuses = ["OPEN", "REVIEWING", "RESOLVED", "DISMISSED"] as const;

export function ReportStatusSelect({ reportId, status }: { reportId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        value={value}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as (typeof statuses)[number];
          const previous = value;
          setValue(next);
          setError(null);
          startTransition(async () => {
            const res = await resolveAbuseReportAction(reportId, next);
            if (res.error) {
              setError(res.error);
              setValue(previous);
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
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </div>
  );
}
