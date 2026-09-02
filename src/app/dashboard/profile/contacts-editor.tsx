"use client";

import { useActionState, useState, useTransition } from "react";
import {
  addContactAction,
  updateContactAction,
  deleteContactAction,
  reorderContactsAction,
  type ContactState,
} from "./actions";

const initial: ContactState = {};
const MAX = 5;

type Contact = {
  id: string;
  name: string;
  relation: string | null;
  phone: string | null;
  email: string | null;
  isPublic: boolean;
};

function swap(ids: string[], from: number, to: number): string[] {
  if (to < 0 || to >= ids.length) return ids;
  const next = [...ids];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

function Fields({ c }: { c?: Contact }) {
  return (
    <div className="grid sm:grid-cols-2 gap-2">
      <input
        name="name"
        required
        defaultValue={c?.name ?? ""}
        placeholder="Name"
        className="rounded-md border border-black/15 px-3 py-2 text-sm"
      />
      <input
        name="relation"
        defaultValue={c?.relation ?? ""}
        placeholder="Relationship (e.g. Brother)"
        className="rounded-md border border-black/15 px-3 py-2 text-sm"
      />
      <input
        name="phone"
        defaultValue={c?.phone ?? ""}
        placeholder="Phone"
        className="rounded-md border border-black/15 px-3 py-2 text-sm"
      />
      <input
        name="email"
        type="email"
        defaultValue={c?.email ?? ""}
        placeholder="Email"
        className="rounded-md border border-black/15 px-3 py-2 text-sm"
      />
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="isPublic" defaultChecked={c ? c.isPublic : true} />
        Show this contact on the public scan page
      </label>
    </div>
  );
}

function Row({
  contact,
  index,
  ids,
}: {
  contact: Contact;
  index: number;
  ids: string[];
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateContactAction.bind(null, contact.id),
    initial,
  );
  const [busy, start] = useTransition();

  if (editing) {
    return (
      <li className="rounded-lg border border-black/10 p-3">
        <form action={formAction} className="space-y-2">
          <Fields c={contact} />
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

  return (
    <li className="rounded-lg border border-black/10 p-3 flex items-center justify-between text-sm">
      <div>
        <p className="font-medium">
          {contact.name}
          {contact.relation ? <span className="text-black/50"> · {contact.relation}</span> : null}
          {!contact.isPublic && <span className="ml-2 text-xs text-black/40">(private)</span>}
        </p>
        <p className="text-xs text-black/50">
          {[contact.phone, contact.email].filter(Boolean).join(" · ") || "No contact details"}
        </p>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <button
          disabled={busy || index === 0}
          onClick={() => start(() => reorderContactsAction(swap(ids, index, index - 1)))}
          className="disabled:opacity-30"
          aria-label="Move up"
        >
          ↑
        </button>
        <button
          disabled={busy || index === ids.length - 1}
          onClick={() => start(() => reorderContactsAction(swap(ids, index, index + 1)))}
          className="disabled:opacity-30"
          aria-label="Move down"
        >
          ↓
        </button>
        <button onClick={() => setEditing(true)} className="text-emerald-600 hover:underline">
          Edit
        </button>
        <button
          onClick={() => start(() => deleteContactAction(contact.id))}
          className="text-red-600 hover:underline"
        >
          Remove
        </button>
      </div>
    </li>
  );
}

export function ContactsEditor({ contacts }: { contacts: Contact[] }) {
  const ids = contacts.map((c) => c.id);
  const [state, formAction, pending] = useActionState(addContactAction, initial);

  return (
    <div className="space-y-3">
      {contacts.length > 0 && (
        <ul className="space-y-2">
          {contacts.map((c, i) => (
            <Row key={c.id} contact={c} index={i} ids={ids} />
          ))}
        </ul>
      )}

      {contacts.length < MAX ? (
        <form
          action={formAction}
          className="rounded-lg border border-dashed border-black/20 p-3 space-y-2"
        >
          <p className="text-sm font-medium">Add an emergency contact</p>
          <Fields />
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-emerald-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
          >
            {pending ? "Adding…" : "Add contact"}
          </button>
        </form>
      ) : (
        <p className="text-xs text-black/50">You&apos;ve added the maximum of {MAX} contacts.</p>
      )}
    </div>
  );
}
