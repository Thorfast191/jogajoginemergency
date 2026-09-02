"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePrivacyAction, type PrivacyInput } from "./actions";
import type { VisibilityFlags } from "@/lib/privacy";

const FIELD_LABELS: Record<keyof VisibilityFlags, string> = {
  photoPublic: "Profile photo",
  namePublic: "Display name",
  messagePublic: "Emergency message",
  bloodGroupPublic: "Blood group",
  allergiesPublic: "Allergies",
  medicalNotesPublic: "Medical notes",
  contactsPublic: "Emergency contacts",
  showPhone: "Public phone number",
};

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
}: {
  flags: VisibilityFlags;
  preset: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function run(input: PrivacyInput) {
    setError(null);
    start(async () => {
      const res = await updatePrivacyAction(input);
      if (res.error) setError(res.error);
      else router.refresh();
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
          <li key={field} className="flex items-center justify-between px-3 py-2.5 text-sm">
            <span>{FIELD_LABELS[field]}</span>
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

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
