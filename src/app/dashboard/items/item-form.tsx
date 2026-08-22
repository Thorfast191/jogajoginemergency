"use client";

import { useActionState, useRef, useEffect } from "react";
import { createItemAction, type ItemFormState } from "./actions";

const initialState: ItemFormState = {};

export function ItemForm() {
  const [state, formAction, pending] = useActionState(createItemAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state.error) formRef.current?.reset();
  }, [pending, state.error]);

  return (
    <form ref={formRef} action={formAction} className="rounded-lg border border-black/10 p-4 space-y-3">
      <h3 className="font-medium">Add an item</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        <input
          name="label"
          placeholder="e.g. Blue Samsonite suitcase"
          required
          className="rounded-md border border-black/15 px-3 py-2 text-sm"
        />
        <input
          name="category"
          placeholder="Category (bag, bike, laptop…)"
          required
          className="rounded-md border border-black/15 px-3 py-2 text-sm"
        />
        <input
          name="photoUrl"
          placeholder="Photo URL (optional)"
          className="rounded-md border border-black/15 px-3 py-2 text-sm sm:col-span-2"
        />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add item"}
      </button>
    </form>
  );
}
