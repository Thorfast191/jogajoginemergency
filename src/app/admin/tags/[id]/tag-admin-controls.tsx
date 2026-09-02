"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setTagStatusAction } from "../../actions";

export function TagAdminControls({ tagId, status }: { tagId: string; status: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const run = (next: "UNASSIGNED" | "LOST" | "ACTIVE") => {
    setError(null);
    start(async () => {
      const res = await setTagStatusAction(tagId, next);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button
          onClick={() => run("UNASSIGNED")}
          disabled={pending || status === "UNASSIGNED"}
          className="rounded-md border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 disabled:opacity-40"
        >
          Return to inventory
        </button>
        <button
          onClick={() => run("LOST")}
          disabled={pending || status === "LOST" || status === "UNASSIGNED"}
          className="rounded-md border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 disabled:opacity-40"
        >
          Mark lost
        </button>
        <button
          onClick={() => run("ACTIVE")}
          disabled={pending || status === "ACTIVE" || status === "UNASSIGNED"}
          className="rounded-md border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 disabled:opacity-40"
        >
          Mark active
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
