"use client";

import { useActionState } from "react";
import { updateTagAction, type TagUpdateState } from "./actions";

const initialState: TagUpdateState = {};

type Tag = { id: string; internalLabel: string | null; status: string };

export function TagSettingsForm({ tag }: { tag: Tag }) {
  const action = updateTagAction.bind(null, tag.id);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
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
        <select
          id="status"
          name="status"
          defaultValue={tag.status === "ACTIVE" || tag.status === "LOST" || tag.status === "DEACTIVATED" ? tag.status : "ACTIVE"}
          className="w-full rounded-md border border-black/15 px-3 py-2 text-sm"
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
