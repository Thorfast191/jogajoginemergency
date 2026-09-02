"use client";

import { useState, useTransition } from "react";
import { generateTagsAction } from "./actions";

export function GenerateTagsButton() {
  const [quantity, setQuantity] = useState("10");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleGenerate() {
    setError(null);
    setSuccess(null);

    const parsedQuantity = Number(quantity);

    startTransition(async () => {
      const result = await generateTagsAction(parsedQuantity);

      if (result.error) {
        setError(result.error);

        if (result.created) {
          setSuccess(`Created ${result.created} tags.`);
        }

        return;
      }

      setSuccess(`Successfully created ${result.created} tags.`);
    });
  }

  return (
    <div className="rounded-lg border border-black/10 p-4">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div>
          <label
            htmlFor="tag-quantity"
            className="block text-sm font-medium mb-1"
          >
            Quantity
          </label>

          <input
            id="tag-quantity"
            type="number"
            min={1}
            max={500}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            disabled={pending}
            className="w-32 rounded-md border border-black/15 px-3 py-2 text-sm disabled:opacity-60"
          />
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={pending}
          className="rounded-md bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? "Generating…" : "Generate tags"}
        </button>
      </div>

      <p className="mt-2 text-xs text-black/50">
        Generate between 1 and 500 unassigned tags at a time.
      </p>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {success && <p className="mt-3 text-sm text-emerald-600">{success}</p>}
    </div>
  );
}
