"use client";

import Link from "next/link";
import { useActionState } from "react";
import { generateTagAction, type GenerateState } from "./actions";

const initial: GenerateState = {};

export function GenerateTagForm({ available, owned }: { available: number; owned: number }) {
  const [state, formAction, pending] = useActionState(generateTagAction, initial);

  if (owned === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-black/15 p-5 text-center">
        <p className="text-sm font-semibold">You don&apos;t have any QR codes yet</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-black/60">
          Every sticker you buy comes with a QR code you generate here and stick on.
        </p>
        <Link
          href="/shop"
          className="mt-4 inline-block rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03]"
        >
          Browse stickers
        </Link>
      </div>
    );
  }

  if (available === 0) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white p-5">
        <p className="text-sm">
          <span className="font-semibold">All {owned} of your QR codes are in use.</span>{" "}
          <Link href="/shop" className="text-[var(--color-primary)] hover:underline">
            Buy another sticker
          </Link>{" "}
          to add more, or delete one you no longer need to free it up.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="rounded-2xl border border-black/10 bg-white p-5">
      <p className="text-sm font-semibold">
        Generate a QR code{" "}
        <span className="font-normal text-black/50">
          &middot; {available} of {owned} left
        </span>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <label htmlFor="internalLabel" className="sr-only">
          What is this for?
        </label>
        <input
          id="internalLabel"
          name="internalLabel"
          maxLength={100}
          placeholder="What's it for? e.g. Red helmet (private)"
          className="min-w-0 flex-1 rounded-xl border border-black/15 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-[var(--color-primary)] px-5 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.03] disabled:opacity-60 disabled:hover:scale-100"
        >
          {pending ? "Generating…" : "Generate QR"}
        </button>
      </div>
      {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
