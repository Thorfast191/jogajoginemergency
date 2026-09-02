"use client";

import { useActionState } from "react";
import { updateTagAction, type TagUpdateState } from "./actions";

const initialState: TagUpdateState = {};

type Tag = {
  id: string;
  itemId: string | null;
  status: string;
  contactMode: string;
  publicDisplayName: string | null;
  publicMessage: string | null;
  maskedPhone: string | null;
};
type Item = { id: string; label: string };

export function TagSettingsForm({ tag, items }: { tag: Tag; items: Item[] }) {
  const action = updateTagAction.bind(null, tag.id);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="itemId">
          Attached item
        </label>
        <select
          id="itemId"
          name="itemId"
          defaultValue={tag.itemId ?? ""}
          className="w-full rounded-md border border-black/15 px-3 py-2 text-sm"
        >
          <option value="">— None —</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="status">
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={tag.status === "UNASSIGNED" ? "ACTIVE" : tag.status}
          className="w-full rounded-md border border-black/15 px-3 py-2 text-sm"
        >
          <option value="ACTIVE">Active</option>
          <option value="LOST">Lost — flag it prominently to finders</option>
          <option value="DEACTIVATED">Deactivated — hide public page</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="contactMode">
          How finders can contact you
        </label>
        <select
          id="contactMode"
          name="contactMode"
          defaultValue={tag.contactMode}
          className="w-full rounded-md border border-black/15 px-3 py-2 text-sm"
        >
          <option value="RELAY">Message relay (recommended — your contact stays private)</option>
          <option value="MASKED_PHONE">Masked click-to-call number</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="publicDisplayName">
          Public display name
        </label>
        <input
          id="publicDisplayName"
          name="publicDisplayName"
          defaultValue={tag.publicDisplayName ?? ""}
          placeholder="e.g. Arafat's bag (shown instead of your full name)"
          className="w-full rounded-md border border-black/15 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="publicMessage">
          Message shown on the scan page
        </label>
        <textarea
          id="publicMessage"
          name="publicMessage"
          defaultValue={tag.publicMessage ?? ""}
          rows={3}
          placeholder="e.g. Thanks for finding this! Please reach out below."
          className="w-full rounded-md border border-black/15 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="maskedPhone">
          Masked phone number (only used if contact mode is click-to-call)
        </label>
        <input
          id="maskedPhone"
          name="maskedPhone"
          defaultValue={tag.maskedPhone ?? ""}
          placeholder="A proxy/forwarding number — never your real one"
          className="w-full rounded-md border border-black/15 px-3 py-2 text-sm"
        />
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
