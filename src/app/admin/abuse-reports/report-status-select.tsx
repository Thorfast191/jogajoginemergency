"use client";

import { useTransition } from "react";
import { resolveAbuseReportAction } from "../actions";

const statuses = ["OPEN", "REVIEWING", "RESOLVED", "DISMISSED"] as const;

export function ReportStatusSelect({ reportId, status }: { reportId: string; status: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={status}
      disabled={pending}
      onChange={(e) =>
        startTransition(() =>
          resolveAbuseReportAction(
            reportId,
            e.target.value as "REVIEWING" | "RESOLVED" | "DISMISSED"
          )
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
