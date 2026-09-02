"use client";

import { useActionState, useState } from "react";
import { updateEmergencyProfileAction, type ProfileState } from "./actions";

const initialState: ProfileState = {};

const BLOOD_GROUPS = ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

type Profile = {
  displayName: string | null;
  emergencyMessage: string | null;
  bloodGroup: string | null;
  allergies: string | null;
  medicalNotes: string | null;
  contactMode: string;
  phonePublic: string | null;
};

export function ProfileForm({ profile, accountName }: { profile: Profile; accountName: string }) {
  const [state, formAction, pending] = useActionState(updateEmergencyProfileAction, initialState);
  const [contactMode, setContactMode] = useState(profile.contactMode);

  return (
    <form action={formAction} className="space-y-5 max-w-lg">
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="displayName">
          Display name
        </label>
        <input
          id="displayName"
          name="displayName"
          defaultValue={profile.displayName ?? ""}
          placeholder={accountName}
          className="w-full rounded-md border border-black/15 px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-black/40">Shown on the scan page when you make your name public.</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="emergencyMessage">
          Emergency message
        </label>
        <textarea
          id="emergencyMessage"
          name="emergencyMessage"
          defaultValue={profile.emergencyMessage ?? ""}
          rows={3}
          maxLength={500}
          placeholder="e.g. If found, please call my brother on the number below."
          className="w-full rounded-md border border-black/15 px-3 py-2 text-sm"
        />
      </div>

      <fieldset className="border border-black/10 rounded-lg p-4">
        <legend className="text-sm font-medium px-1">Medical (private by default)</legend>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" htmlFor="bloodGroup">
              Blood group
            </label>
            <select
              id="bloodGroup"
              name="bloodGroup"
              defaultValue={profile.bloodGroup ?? ""}
              className="w-full rounded-md border border-black/15 px-3 py-2 text-sm"
            >
              {BLOOD_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {g || "—"}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-xs font-medium mb-1" htmlFor="allergies">
            Allergies
          </label>
          <textarea
            id="allergies"
            name="allergies"
            defaultValue={profile.allergies ?? ""}
            rows={2}
            maxLength={500}
            className="w-full rounded-md border border-black/15 px-3 py-2 text-sm"
          />
        </div>
        <div className="mt-3">
          <label className="block text-xs font-medium mb-1" htmlFor="medicalNotes">
            Other medical notes
          </label>
          <textarea
            id="medicalNotes"
            name="medicalNotes"
            defaultValue={profile.medicalNotes ?? ""}
            rows={2}
            maxLength={500}
            className="w-full rounded-md border border-black/15 px-3 py-2 text-sm"
          />
        </div>
      </fieldset>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="contactMode">
          How finders reach you
        </label>
        <select
          id="contactMode"
          name="contactMode"
          value={contactMode}
          onChange={(e) => setContactMode(e.target.value)}
          className="w-full rounded-md border border-black/15 px-3 py-2 text-sm"
        >
          <option value="RELAY">Message relay (recommended — your contact stays private)</option>
          <option value="DIRECT_CALL">Click-to-call a public number</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="phonePublic">
          Public phone number
        </label>
        <input
          id="phonePublic"
          name="phonePublic"
          defaultValue={profile.phonePublic ?? ""}
          required={contactMode === "DIRECT_CALL"}
          placeholder="Shown publicly on your scan page"
          className="w-full rounded-md border border-black/15 px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-amber-700">
          Anyone who scans your tag can see this when you enable it in Privacy. Use a
          forwarding number if you&apos;d rather not share your personal one.
        </p>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">Saved.</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
