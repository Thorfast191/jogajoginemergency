"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveProductAction } from "../actions";

export function ArchiveButton({ productId }: { productId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await archiveProductAction(productId);
            if (res.error) setError(res.error);
            else router.refresh();
          })
        }
        disabled={pending}
        className="text-sm text-red-600 hover:underline disabled:opacity-60 text-left"
      >
        {pending ? "Archiving…" : "Archive this product"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
