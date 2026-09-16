"use client";

import { useActionState } from "react";
import { useKeptForm } from "@/lib/use-kept-form";
import { updateTagAction, type TagUpdateState } from "./actions";

const initialState: TagUpdateState = {};

type Tag = { id: string; internalLabel: string | null; status: string; takenDown: boolean };

export function TagSettingsForm({ tag }: { tag: Tag }) {
  const action = updateTagAction.bind(null, tag.id);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [formRef, submitForm] = useKeptForm(formAction, state);

  return (
    <form ref={formRef} action={formAction} onSubmit={submitForm} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="internalLabel">
          Internal label <span className="text-black/40">(private — only you see this)</span>
        </label>
        <input
          id="internalLabel"
          name="internalLabel"
          defaultValue={tag.internalLabel ?? ""}
          placeholder="e.g. My red bike sticker"
          className="w-full rounded-md border border-black/15 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="status">
          Status
        </label>
        {tag.takenDown && (
          <p role="alert" className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
            Our team took this QR code down, so its page is offline and its status can&apos;t be
            changed here. Contact us if you think that&apos;s a mistake.
          </p>
        )}
        <select
          id="status"
          // A disabled control isn't submitted, so the status is left as it is.
          disabled={tag.takenDown}
          name="status"
          defaultValue={tag.status === "ACTIVE" || tag.status === "LOST" || tag.status === "DEACTIVATED" ? tag.status : "ACTIVE"}
          className="w-full rounded-md border border-black/15 px-3 py-2 text-sm disabled:bg-black/[0.03] disabled:text-black/50"
        >
          <option value="ACTIVE">Active</option>
          <option value="LOST">Lost — flag it prominently to finders</option>
          <option value="DEACTIVATED">Deactivated — hide the public page</option>
        </select>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">Saved.</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
