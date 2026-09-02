"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateTagBatchAction } from "./actions";

type Product = { id: string; name: string };

export function GenerateBatchForm({ products }: { products: Product[] }) {
  const [quantity, setQuantity] = useState("10");
  const [productId, setProductId] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function generate() {
    setError(null);
    setSuccess(null);
    start(async () => {
      const res = await generateTagBatchAction({
        quantity: Number(quantity),
        productId: productId || null,
        label: label.trim() || "Untitled batch",
      });
      if (res.error) {
        setError(res.error);
        if (res.created) setSuccess(`Created ${res.created} tags.`);
        return;
      }
      setSuccess(`Created ${res.created} tags.`);
      setLabel("");
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-black/10 p-4">
      <h2 className="text-sm font-semibold">Generate a batch</h2>
      <div className="mt-3 grid sm:grid-cols-4 gap-3">
        <label className="text-xs">
          Quantity
          <input
            type="number"
            min={1}
            max={500}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            disabled={pending}
            className="mt-1 w-full rounded-md border border-black/15 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs sm:col-span-2">
          Batch label
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Feb 2026 bike run"
            disabled={pending}
            className="mt-1 w-full rounded-md border border-black/15 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs">
          Product
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            disabled={pending}
            className="mt-1 w-full rounded-md border border-black/15 px-3 py-2 text-sm"
          >
            <option value="">Unassigned</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button
        type="button"
        onClick={generate}
        disabled={pending}
        className="mt-3 rounded-md bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Generating…" : "Generate tags"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {success && <p className="mt-2 text-sm text-emerald-600">{success}</p>}
    </div>
  );
}
