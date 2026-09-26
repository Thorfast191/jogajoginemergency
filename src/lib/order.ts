import { customAlphabet } from "nanoid";

// Human-friendly order reference. Uppercase unambiguous alphabet (shares the
// shortCode set minus lowercase); collisions are handled by the unique index +
// a retry at the call site.
const nano = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 6);

export function generateOrderNumber(): string {
  return `JJ-${nano()}`;
}

type OrderedLine = {
  productId: string;
  quantity: number;
  unitPriceCents: number;
  currency: string;
  themeId?: string | null;
};
type CartLineLike = {
  productId: string;
  qty: number;
  unitPriceCents: number;
  currency: string;
  themeId?: string | null;
};

/** Absent and null are the same answer: "whatever the product carries". */
function themeKey(themeId: string | null | undefined): string {
  return themeId ?? "";
}

/**
 * Whether the cart still describes exactly what an existing order bought.
 *
 * A checkout form carries one idempotency key, so submitting it again resumes
 * the order that key created. If the cart has changed since, the order and the
 * cart disagree about what is being paid for, and neither may be trusted to
 * price the other.
 *
 * The chosen theme is part of that: it is printed on the sticker and it is what
 * unlocks the theme on the account, so swapping it between submits would ship
 * one artwork and grant another.
 */
export function orderMatchesCart(items: OrderedLine[], lines: CartLineLike[]): boolean {
  if (lines.length === 0 || items.length !== lines.length) return false;
  const key = (
    productId: string,
    qty: number,
    price: number,
    currency: string,
    themeId: string | null | undefined,
  ) => `${productId}|${qty}|${price}|${currency.toUpperCase()}|${themeKey(themeId)}`;
  const ordered = items
    .map((i) => key(i.productId, i.quantity, i.unitPriceCents, i.currency, i.themeId))
    .sort();
  const inCart = lines
    .map((l) => key(l.productId, l.qty, l.unitPriceCents, l.currency, l.themeId))
    .sort();
  return ordered.every((k, i) => k === inCart[i]);
}

export type OrderPlanRef = { planId: string | null; planPriceCents: number | null };

/**
 * Whether the plan on an order is still the plan in the cart, at the same price.
 *
 * Same reasoning as the lines above, and the same consequence if it is skipped:
 * the order's total was built from a plan price, so a cart that now names a
 * different plan — or none — must not be paid against it.
 */
export function orderPlanMatchesCart(ordered: OrderPlanRef, inCart: OrderPlanRef): boolean {
  if (ordered.planId !== inCart.planId) return false;
  return (ordered.planPriceCents ?? null) === (inCart.planPriceCents ?? null);
}
