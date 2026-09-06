"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePortfolioVisibilityAction } from "./actions";

const LABELS = {
  bioPublic: "Short bio",
  linksPublic: "Links",
} as const;

export function PortfolioVisibility({
  bioPublic,
  linksPublic,
  entitled,
}: {
  bioPublic: boolean;
  linksPublic: boolean;
  entitled: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const values = { bioPublic, linksPublic };

  return (
    <div className="mt-8">
      <h2 className="font-semibold">Portfolio</h2>
      <p className="mt-1 text-sm text-black/60">
        {entitled
          ? "The optional half of your scan page."
          : "Saved, but nothing publishes until your page is live."}
      </p>

      <ul className="mt-3 divide-y divide-black/10 rounded-xl border border-black/10 bg-white">
        {(Object.keys(LABELS) as (keyof typeof LABELS)[]).map((field) => (
          <li key={field} className="flex items-center justify-between gap-3 px-4 py-3">
            <span className={`text-sm ${entitled ? "" : "text-black/40"}`}>{LABELS[field]}</span>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={values[field]}
                disabled={pending}
                onChange={(e) => {
                  const value = e.target.checked;
                  setError(null);
                  start(async () => {
                    const res = await updatePortfolioVisibilityAction({ field, value });
                    if (res.error) setError(res.error);
                    else router.refresh();
                  });
                }}
              />
              <span className="text-xs text-black/50">{values[field] ? "Shown" : "Hidden"}</span>
            </label>
          </li>
        ))}
      </ul>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {!entitled && (
        <p className="mt-2 text-xs text-violet-800">
          <Link href="/dashboard/subscription" className="font-semibold hover:underline">
Subscribe to publish your page →
          </Link>
        </p>
      )}
    </div>
  );
}
