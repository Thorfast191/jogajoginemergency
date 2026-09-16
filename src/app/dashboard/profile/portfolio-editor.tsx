"use client";

import Link from "next/link";
import { useActionState, useTransition } from "react";
import { useKeptForm } from "@/lib/use-kept-form";
import { updateBioAction, addLinkAction, deleteLinkAction, type LinkState } from "./actions";

const initial: LinkState = {};
const MAX = 6;

type ProfileLink = { id: string; label: string; url: string; isPublic: boolean };

const inputClass =
  "rounded-xl border border-black/15 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none";

/**
 * Bio and links. Editable without a subscription on purpose — the data belongs
 * to the owner either way — but clearly marked as unpublished until the page is
 * live.
 */
export function PortfolioEditor({
  bio,
  links,
  entitled,
}: {
  bio: string | null;
  links: ProfileLink[];
  entitled: boolean;
}) {
  const [bioState, bioAction, bioPending] = useActionState(updateBioAction, initial);
  const [bioFormRef, submitBio] = useKeptForm(bioAction, bioState);
  const [linkState, linkAction, linkPending] = useActionState(addLinkAction, initial);
  const [linkFormRef, submitLink] = useKeptForm(linkAction, linkState, true);
  const [busy, start] = useTransition();

  return (
    <div className="space-y-5">
      {!entitled && (
        <p className="rounded-xl bg-violet-50 px-4 py-3 text-sm text-violet-900">
          Saved, but <strong>not published</strong> — your page isn&apos;t live yet.{" "}
          <Link href="/dashboard/subscription" className="font-semibold hover:underline">
            Subscribe to publish it →
          </Link>
        </p>
      )}

      <form ref={bioFormRef} action={bioAction} onSubmit={submitBio} className="space-y-2">
        <label htmlFor="bio" className="block text-sm font-semibold">
          Short bio
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={2}
          maxLength={280}
          defaultValue={bio ?? ""}
          placeholder="Product designer in Dhaka. Cyclist, occasionally lost."
          className={`w-full ${inputClass}`}
        />
        {bioState.error && <p className="text-sm text-red-600">{bioState.error}</p>}
        <button
          type="submit"
          disabled={bioPending}
          className="rounded-xl bg-[var(--color-primary)] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {bioPending ? "Saving…" : "Save bio"}
        </button>
      </form>

      {links.length > 0 && (
        <ul className="space-y-2">
          {links.map((l) => (
            <li
              key={l.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-black/10 p-3 text-sm"
            >
              <div className="min-w-0">
                <p className="font-semibold">
                  {l.label}
                  {!l.isPublic && <span className="ml-2 text-xs text-black/40">(private)</span>}
                </p>
                <p className="truncate text-xs text-black/50">{l.url}</p>
              </div>
              <button
                onClick={() => start(() => deleteLinkAction(l.id))}
                disabled={busy}
                className="shrink-0 text-xs text-red-600 hover:underline disabled:opacity-40"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {links.length < MAX ? (
        <form ref={linkFormRef} action={linkAction} onSubmit={submitLink} className="space-y-2 rounded-xl border border-dashed border-black/20 p-3">
          <p className="text-sm font-semibold">Add a link</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input name="label" required placeholder="Instagram" className={inputClass} />
            <input name="url" required placeholder="https://…" className={inputClass} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isPublic" defaultChecked />
            Show this link on the scan page
          </label>
          {linkState.error && <p className="text-sm text-red-600">{linkState.error}</p>}
          <button
            type="submit"
            disabled={linkPending}
            className="rounded-xl bg-[var(--color-primary)] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {linkPending ? "Adding…" : "Add link"}
          </button>
        </form>
      ) : (
        <p className="text-xs text-black/50">You&apos;ve added the maximum of {MAX} links.</p>
      )}
    </div>
  );
}
