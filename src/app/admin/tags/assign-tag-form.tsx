"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignTagAction } from "../actions";

type Customer = { id: string; name: string; email: string };
type UnassignedTag = { id: string; shortCode: string };

export function AssignTagForm({
  customers,
  unassignedTags,
}: {
  customers: Customer[];
  unassignedTags: UnassignedTag[];
}) {
  const [userId, setUserId] = useState("");
  const [tagId, setTagId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const disabled = pending || customers.length === 0 || unassignedTags.length === 0;

  function handleAssign() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await assignTagAction(userId, tagId);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setSuccess("Tag assigned.");
      setUserId("");
      setTagId("");
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-black/10 p-4">
      <h2 className="text-sm font-semibold">Assign a tag to a customer</h2>
      <p className="mt-1 text-xs text-black/50">
        Moves an unassigned inventory tag to <span className="font-mono">ACTIVE</span> under that
        customer. Checks their subscription and tag limit.
      </p>

      <div className="mt-3 flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <label htmlFor="assign-customer" className="block text-xs font-medium mb-1">
            Customer
          </label>
          <select
            id="assign-customer"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            disabled={pending}
            className="w-full rounded-md border border-black/15 px-3 py-2 text-sm disabled:opacity-60"
          >
            <option value="">Select a customer…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.email}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label htmlFor="assign-tag" className="block text-xs font-medium mb-1">
            Unassigned tag
          </label>
          <select
            id="assign-tag"
            value={tagId}
            onChange={(e) => setTagId(e.target.value)}
            disabled={pending}
            className="w-full rounded-md border border-black/15 px-3 py-2 text-sm font-mono disabled:opacity-60"
          >
            <option value="">Select a tag…</option>
            {unassignedTags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.shortCode}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleAssign}
          disabled={disabled || !userId || !tagId}
          className="rounded-md bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? "Assigning…" : "Assign tag"}
        </button>
      </div>

      {customers.length === 0 && (
        <p className="mt-2 text-xs text-black/50">No customer accounts yet.</p>
      )}
      {unassignedTags.length === 0 && customers.length > 0 && (
        <p className="mt-2 text-xs text-black/50">No unassigned tags in inventory — generate some above.</p>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {success && <p className="mt-3 text-sm text-emerald-600">{success}</p>}
    </div>
  );
}
