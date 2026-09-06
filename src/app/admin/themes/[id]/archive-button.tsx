"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveThemeAction } from "../actions";

export function ArchiveThemeButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <button
      disabled={pending}
      onClick={() => start(async () => { await archiveThemeAction(id); router.refresh(); })}
      className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-60"
    >
      {pending ? "Archiving…" : "Archive theme"}
    </button>
  );
}
