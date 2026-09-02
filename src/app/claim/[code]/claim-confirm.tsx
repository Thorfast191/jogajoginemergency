"use client";

import { useActionState } from "react";
import { claimTagAction, type ClaimState } from "../actions";

const initial: ClaimState = {};

export function ClaimConfirm({ code }: { code: string }) {
  const [state, formAction, pending] = useActionState(claimTagAction, initial);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="code" value={code} />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-emerald-600 text-white px-4 py-2 font-medium hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Claiming…" : "Claim this tag"}
      </button>
    </form>
  );
}
