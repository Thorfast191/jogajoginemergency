// The shopping cart lives in an httpOnly `jj_cart` cookie holding
// `[{ slug, qty }]`. Everything here is pure so the cookie's contents — which
// are entirely under the client's control — can be validated and clamped in
// one tested place. Prices are never stored in the cart: checkout re-reads
// every price from the database.

export type CartLine = { slug: string; qty: number };

export const CART_COOKIE = "jj_cart";
export const MAX_QTY = 10;
export const MAX_LINES = 10;
const MAX_SLUG_LENGTH = 64;

function clampQty(value: unknown): number {
  const n = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n)) return 1;
  return Math.min(MAX_QTY, Math.max(1, Math.trunc(n)));
}

/** Parse the cookie defensively. Anything malformed yields an empty cart. */
export function parseCart(raw: string | null | undefined): CartLine[] {
  if (!raw) return [];

  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(decoded)) return [];

  // Merge duplicates rather than trusting the client to send distinct lines.
  const merged = new Map<string, number>();
  for (const entry of decoded) {
    if (typeof entry !== "object" || entry === null) continue;
    const { slug } = entry as { slug?: unknown };
    if (typeof slug !== "string" || !slug || slug.length > MAX_SLUG_LENGTH) continue;

    const qty = clampQty((entry as { qty?: unknown }).qty);
    merged.set(slug, Math.min(MAX_QTY, (merged.get(slug) ?? 0) + qty));
    if (merged.size >= MAX_LINES) break;
  }

  return [...merged].map(([slug, qty]) => ({ slug, qty }));
}

export function serializeCart(lines: CartLine[]): string {
  return JSON.stringify(lines.map(({ slug, qty }) => ({ slug, qty })));
}

export function addLine(lines: CartLine[], slug: string, qty = 1): CartLine[] {
  const existing = lines.find((l) => l.slug === slug);
  if (existing) {
    return lines.map((l) =>
      l.slug === slug ? { ...l, qty: Math.min(MAX_QTY, l.qty + clampQty(qty)) } : l,
    );
  }
  if (lines.length >= MAX_LINES) return lines;
  return [...lines, { slug, qty: clampQty(qty) }];
}

export function setLineQty(lines: CartLine[], slug: string, qty: number): CartLine[] {
  if (qty <= 0) return removeLine(lines, slug);
  return lines.map((l) => (l.slug === slug ? { ...l, qty: clampQty(qty) } : l));
}

export function removeLine(lines: CartLine[], slug: string): CartLine[] {
  return lines.filter((l) => l.slug !== slug);
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((n, l) => n + l.qty, 0);
}
