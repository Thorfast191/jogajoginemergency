"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { confirmConsentAction, updatePrivacyAction, type PrivacyInput } from "./actions";
import { CONSENT_TEXT, FIELD_LABELS, type VisibilityFlags } from "@/lib/privacy";

const ORDER: (keyof VisibilityFlags)[] = [
  "photoPublic",
  "namePublic",
  "messagePublic",
  "contactsPublic",
  "showPhone",
  "bloodGroupPublic",
  "allergiesPublic",
  "medicalNotesPublic",
];

export function PrivacyControls({
  flags,
  preset,
  phoneShowable,
}: {
  flags: VisibilityFlags;
  preset: string;
  /** Click-to-call is on and a number is saved — without both, the switch alone shows nothing. */
  phoneShowable: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // A change the server held back until the owner agrees to CONSENT_TEXT.
  const [awaiting, setAwaiting] = useState<PrivacyInput | null>(null);
  const router = useRouter();

  function run(input: PrivacyInput) {
    setError(null);
    start(async () => {
      const res = await updatePrivacyAction(input);
      if (res.needsConsent) {
        setAwaiting(input);
      } else if (res.error) {
        setError(res.error);
      } else {
        setAwaiting(null);
        router.refresh();
      }
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {(["MINIMAL", "STANDARD", "FULL"] as const).map((p) => (
          <button
            key={p}
            onClick={() => run({ preset: p })}
            disabled={pending}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              preset === p ? "border-emerald-600 bg-emerald-50 text-emerald-700" : "border-black/15 hover:bg-black/5"
            }`}
          >
            {p[0] + p.slice(1).toLowerCase()}
          </button>
        ))}
        {preset === "CUSTOM" && (
          <span className="self-center text-xs text-black/40">Custom</span>
        )}
      </div>

      <ul className="mt-4 divide-y divide-black/10 rounded-lg border border-black/10">
        {ORDER.map((field) => (
          <li key={field} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
            <span>
              {FIELD_LABELS[field]}
              {field === "showPhone" && flags.showPhone && !phoneShowable && (
                <span className="mt-0.5 block text-xs text-amber-700">
                  Not shown yet: choose click-to-call and add a public number in{" "}
                  <Link href="/dashboard/profile" className="underline">
                    My Profile
                  </Link>
                  .
                </span>
              )}
            </span>
            <label className="inline-flex items-center gap-2">
              <span className="text-xs text-black/50">{flags[field] ? "Public" : "Private"}</span>
              <input
                type="checkbox"
                checked={flags[field]}
                disabled={pending}
                onChange={(e) => run({ field, value: e.target.checked })}
              />
            </label>
          </li>
        ))}
      </ul>

      {awaiting && (
        <ConsentPanel
          pending={pending}
          onAgree={() => run({ ...awaiting, consent: true })}
          onCancel={() => setAwaiting(null)}
        />
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function ConsentPanel({
  pending,
  onAgree,
  onCancel,
}: {
  pending: boolean;
  onAgree: () => void;
  onCancel: () => void;
}) {
  const [agreed, setAgreed] = useState(false);
  return (
    <div role="alertdialog" aria-labelledby="consent-title" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
      <p id="consent-title" className="font-semibold">Before this goes public</p>
      <label className="mt-2 flex items-start gap-2">
        <input type="checkbox" className="mt-1" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        <span>{CONSENT_TEXT}</span>
      </label>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onAgree}
          disabled={!agreed || pending}
          className="rounded-md bg-emerald-600 px-3 py-1.5 font-medium text-white disabled:opacity-50"
        >
          Agree and publish
        </button>
        <button type="button" onClick={onCancel} className="rounded-md border border-black/15 px-3 py-1.5">
          Keep it private
        </button>
      </div>
    </div>
  );
}

/**
 * For an owner who published contacts or medical details before consent was
 * asked for. Their page keeps working; this asks them to confirm or change it.
 */
export function ConsentReview({ fields }: { fields: string[] }) {
  const [pending, start] = useTransition();
  const [agreed, setAgreed] = useState(false);
  const router = useRouter();
  return (
    <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
      <p className="font-semibold">Please review what your scan page shows</p>
      <p className="mt-1 text-black/70">
        Anyone who scans your QR code can currently see: {fields.join(", ")}. Switch off anything you
        don&apos;t want shown, or confirm below.
      </p>
      <label className="mt-3 flex items-start gap-2">
        <input type="checkbox" className="mt-1" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        <span>{CONSENT_TEXT}</span>
      </label>
      <button
        type="button"
        disabled={!agreed || pending}
        onClick={() =>
          start(async () => {
            await confirmConsentAction();
            router.refresh();
          })
        }
        className="mt-3 rounded-md bg-emerald-600 px-3 py-1.5 font-medium text-white disabled:opacity-50"
      >
        Confirm
      </button>
    </div>
  );
}
