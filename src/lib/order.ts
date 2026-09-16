import { customAlphabet } from "nanoid";

// Human-friendly order reference. Uppercase unambiguous alphabet (shares the
// shortCode set minus lowercase); collisions are handled by the unique index +
// a retry at the call site.
const nano = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 6);

export function generateOrderNumber(): string {
  return `JJ-${nano()}`;
}

type OrderedLine = { productId: string; quantity: number; unitPriceCents: number; currency: string };
type CartLineLike = { productId: string; qty: number; unitPriceCents: number; currency: string };

/**
 * Whether the cart still describes exactly what an existing order bought.
 *
 * A checkout form carries one idempotency key, so submitting it again resumes
 * the order that key created. If the cart has changed since, the order and the
 * cart disagree about what is being paid for, and neither may be trusted to
 * price the other.
 */
export function orderMatchesCart(items: OrderedLine[], lines: CartLineLike[]): boolean {
  if (lines.length === 0 || items.length !== lines.length) return false;
  const key = (productId: string, qty: number, price: number, currency: string) =>
    `${productId}|${qty}|${price}|${currency.toUpperCase()}`;
  const ordered = items.map((i) => key(i.productId, i.quantity, i.unitPriceCents, i.currency)).sort();
  const inCart = lines.map((l) => key(l.productId, l.qty, l.unitPriceCents, l.currency)).sort();
  return ordered.every((k, i) => k === inCart[i]);
}
