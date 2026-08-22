"use client";

import { useTransition } from "react";
import { deleteItemAction } from "./actions";

export function DeleteItemButton({ itemId }: { itemId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => deleteItemAction(itemId))}
      disabled={pending}
      className="text-xs text-red-600 hover:underline disabled:opacity-60"
    >
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}
