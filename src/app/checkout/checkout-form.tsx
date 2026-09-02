"use client";

import { useActionState, useState } from "react";
import { createOrderAction, type CheckoutState } from "./actions";
import { formatPrice } from "@/lib/money";

const initial: CheckoutState = {};

type Product = { slug: string; name: string; priceCents: number; currency: string };

export function CheckoutForm({ product, quantity }: { product: Product; quantity: number }) {
  const [state, formAction, pending] = useActionState(createOrderAction, initial);
  const [qty, setQty] = useState(quantity);

  return (
    <form action={formAction} className="space-y-6 max-w-lg">
      <input type="hidden" name="productSlug" value={product.slug} />

      <div className="rounded-lg border border-black/10 p-4">
        <div className="flex justify-between">
          <span className="font-medium">{product.name}</span>
          <span>{formatPrice(product.priceCents, product.currency)}</span>
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <label htmlFor="quantity">Quantity</label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            min={1}
            max={10}
            value={qty}
            onChange={(e) => setQty(Math.min(10, Math.max(1, Number(e.target.value) || 1)))}
            className="w-20 rounded-md border border-black/15 px-2 py-1"
          />
        </div>
        <div className="mt-3 flex justify-between font-semibold">
          <span>Total</span>
          <span>{formatPrice(product.priceCents * qty, product.currency)}</span>
        </div>
      </div>

      <fieldset className="rounded-lg border border-black/10 p-4 space-y-3">
        <legend className="text-sm font-medium px-1">Shipping (optional)</legend>
        <div className="grid sm:grid-cols-2 gap-3">
          <input name="shipName" placeholder="Name" className="rounded-md border border-black/15 px-3 py-2 text-sm" />
          <input name="shipPhone" placeholder="Phone" className="rounded-md border border-black/15 px-3 py-2 text-sm" />
          <input name="shipAddress" placeholder="Address" className="rounded-md border border-black/15 px-3 py-2 text-sm sm:col-span-2" />
          <input name="shipCity" placeholder="City" className="rounded-md border border-black/15 px-3 py-2 text-sm" />
          <input name="shipNote" placeholder="Delivery note" className="rounded-md border border-black/15 px-3 py-2 text-sm sm:col-span-2" />
        </div>
      </fieldset>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-emerald-600 text-white px-4 py-3 font-medium hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Placing order…" : "Pay (demo)"}
      </button>
      <p className="text-xs text-black/40 text-center">
        Payments run in demo mode — no real charge is made. Your tags activate immediately.
      </p>
    </form>
  );
}
