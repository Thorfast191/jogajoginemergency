"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveThemeAction } from "../actions";

export function ArchiveThemeButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="flex flex-col gap-1">
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await archiveThemeAction(id);
            if (res.error) setError(res.error);
            else router.refresh();
          })
        }
        className="w-fit rounded-md border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-60"
      >
        {pending ? "Archiving…" : "Archive theme"}
      </button>
      {error && <span className="text-xs text-red-700">{error}</span>}
    </div>
  );
}
