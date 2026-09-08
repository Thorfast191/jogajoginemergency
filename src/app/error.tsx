"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * The route-level error boundary.
 *
 * Deliberately says nothing about what went wrong: this renders for finders
 * and customers alike, and a stack trace or database message is not theirs to
 * read. The digest is shown because it is the one thing that makes a support
 * conversation about a specific failure possible.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-sm text-black/60">
          This one is on us, not you. Try again — and if it keeps happening, let us know.
        </p>

        <div className="mt-6 flex justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-md border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/5"
          >
            Go home
          </Link>
        </div>

        {error.digest && (
          <p className="mt-6 font-mono text-[11px] text-black/40">Reference: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
