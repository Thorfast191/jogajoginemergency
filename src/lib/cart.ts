// Checkout is single-product for v1: /checkout?product=<slug>&qty=<1..10>.
// The schema supports multi-line orders; the UI does not yet.

export type CheckoutParams = { productSlug: string; quantity: number };

type ParamSource = URLSearchParams | Record<string, string | string[] | undefined>;

function read(source: ParamSource, key: string): string | undefined {
  if (source instanceof URLSearchParams) return source.get(key) ?? undefined;
  const v = source[key];
  return Array.isArray(v) ? v[0] : v;
}

export function parseCheckoutParams(source: ParamSource): CheckoutParams | null {
  const productSlug = read(source, "product")?.trim();
  if (!productSlug) return null;

  const rawQty = Number.parseInt(read(source, "qty") ?? "", 10);
  const quantity = Number.isNaN(rawQty) ? 1 : Math.min(10, Math.max(1, rawQty));

  return { productSlug, quantity };
}
