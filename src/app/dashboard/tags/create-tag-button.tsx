"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTagAction } from "./actions";

export function CreateTagButton() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div>
      <button
        onClick={() =>
          startTransition(async () => {
            const result = await createTagAction();
            setError(result.error ?? null);
            if (!result.error) router.refresh();
          })
        }
        disabled={pending}
        className="rounded-md bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Generating…" : "Generate new tag"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
