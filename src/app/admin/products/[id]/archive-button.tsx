"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveProductAction } from "../actions";

export function ArchiveButton({ productId }: { productId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <button
      onClick={() =>
        start(async () => {
          await archiveProductAction(productId);
          router.refresh();
        })
      }
      disabled={pending}
      className="text-sm text-red-600 hover:underline disabled:opacity-60"
    >
      {pending ? "Archiving…" : "Archive this product"}
    </button>
  );
}
