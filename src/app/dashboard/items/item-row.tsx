"use client";

import { useActionState, useState } from "react";
import { updateItemAction, type ItemFormState } from "./actions";
import { DeleteItemButton } from "./delete-button";

type Item = { id: string; label: string; category: string; photoUrl: string | null };

const initialState: ItemFormState = {};

export function ItemRow({ item, tagCount }: { item: Item; tagCount: number }) {
  const [editing, setEditing] = useState(false);
  const action = updateItemAction.bind(null, item.id);
  const [state, formAction, pending] = useActionState(action, initialState);

  if (!editing) {
    return (
      <li className="rounded-lg border border-black/10 p-4 flex items-center justify-between">
        <div>
          <p className="font-medium">{item.label}</p>
          <p className="text-xs text-black/50">
            {item.category} · {tagCount} tag{tagCount === 1 ? "" : "s"} attached
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setEditing(true)} className="text-xs text-emerald-600 hover:underline">
            Edit
          </button>
          <DeleteItemButton itemId={item.id} />
        </div>
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-black/10 p-4">
      <form action={formAction} className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <input
            name="label"
            defaultValue={item.label}
            required
            className="rounded-md border border-black/15 px-3 py-2 text-sm"
          />
          <input
            name="category"
            defaultValue={item.category}
            required
            className="rounded-md border border-black/15 px-3 py-2 text-sm"
          />
          <input
            name="photoUrl"
            defaultValue={item.photoUrl ?? ""}
            placeholder="Photo URL (optional)"
            className="rounded-md border border-black/15 px-3 py-2 text-sm sm:col-span-2"
          />
        </div>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-emerald-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-md border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5"
          >
            Cancel
          </button>
        </div>
      </form>
    </li>
  );
}
