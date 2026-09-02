"use client";

import { useActionState } from "react";
import { createProductAction, updateProductAction, type ProductState } from "./actions";

const initial: ProductState = {};

type Product = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  useCase: string | null;
  priceCents: number;
  currency: string;
  status: string;
  sortOrder: number;
};

export function ProductForm({ product }: { product?: Product }) {
  const action = product ? updateProductAction.bind(null, product.id) : createProductAction;
  const [state, formAction, pending] = useActionState<ProductState, FormData>(action, initial);

  const field = "w-full rounded-md border border-black/15 px-3 py-2 text-sm";

  return (
    <form action={formAction} className="space-y-3 max-w-xl">
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-sm">
          Slug
          <input name="slug" defaultValue={product?.slug ?? ""} required className={field} />
        </label>
        <label className="text-sm">
          Name
          <input name="name" defaultValue={product?.name ?? ""} required className={field} />
        </label>
      </div>
      <label className="text-sm block">
        Tagline
        <input name="tagline" defaultValue={product?.tagline ?? ""} required className={field} />
      </label>
      <label className="text-sm block">
        Description
        <textarea
          name="description"
          defaultValue={product?.description ?? ""}
          required
          rows={4}
          className={field}
        />
      </label>
      <label className="text-sm block">
        Use case
        <input name="useCase" defaultValue={product?.useCase ?? ""} className={field} />
      </label>
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="text-sm">
          Price (cents)
          <input
            name="priceCents"
            type="number"
            min={0}
            defaultValue={product?.priceCents ?? 0}
            required
            className={field}
          />
        </label>
        <label className="text-sm">
          Currency
          <input name="currency" defaultValue={product?.currency ?? "BDT"} className={field} />
        </label>
        <label className="text-sm">
          Sort order
          <input
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={product?.sortOrder ?? 0}
            className={field}
          />
        </label>
      </div>
      <label className="text-sm block">
        Status
        <select name="status" defaultValue={product?.status ?? "DRAFT"} className={field}>
          <option value="DRAFT">Draft</option>
          <option value="ACTIVE">Active</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </label>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">Saved.</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Saving…" : product ? "Save changes" : "Create product"}
      </button>
    </form>
  );
}
