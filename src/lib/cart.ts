// The shopping cart lives in an httpOnly `jj_cart` cookie holding
// `{ l: [{ slug, qty, theme }], p: planSlug }`. Everything here is pure so the
// cookie's contents — which are entirely under the client's control — can be
// validated and clamped in one tested place. Prices are never stored in the
// cart: checkout re-reads every price from the database.
//
// Two things ride along with the products:
//
//   `theme` — the artwork the buyer picked for that line. A sticker product
//   carries a default theme, so this is a choice, not a requirement, and a
//   line without one still resolves (see src/lib/cart-server.ts).
//
//   `p` — a subscription plan added to the same checkout. Without it, buying a
//   sticker and publishing the page it opens were two separate payments, and
//   the second one was never mentioned while the first was being made.
//
// Older cookies hold a bare `[{ slug, qty }]` array. Those are still read, so
// nobody's cart empties on deploy.

export type CartLine = { slug: string; qty: number; theme?: string };

export const CART_COOKIE = "jj_cart";
export const MAX_QTY = 10;
export const MAX_LINES = 10;
const MAX_SLUG_LENGTH = 64;

function clampQty(value: unknown): number {
  const n = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n)) return 1;
  return Math.min(MAX_QTY, Math.max(1, Math.trunc(n)));
}

/** A slug from the cookie, or null if it isn't one. */
function cleanSlug(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const slug = value.trim();
  if (!slug || slug.length > MAX_SLUG_LENGTH) return null;
  return slug;
}

/**
 * The same product in two themes is two lines, so identity is the pair. Keyed
 * with a separator that cannot appear in a slug.
 */
function lineKey(slug: string, theme: string | undefined): string {
  return `${slug}\u0000${theme ?? ""}`;
}

function sameLine(line: CartLine, slug: string, theme: string | undefined): boolean {
  return line.slug === slug && (line.theme ?? undefined) === (theme ?? undefined);
}

/** Build a line, leaving `theme` off entirely when there isn't one. */
function makeLine(slug: string, qty: number, theme: string | undefined): CartLine {
  return theme ? { slug, qty, theme } : { slug, qty };
}

/** The raw lines array out of either cookie shape. */
function rawLines(decoded: unknown): unknown[] {
  if (Array.isArray(decoded)) return decoded;
  if (typeof decoded === "object" && decoded !== null) {
    const { l } = decoded as { l?: unknown };
    if (Array.isArray(l)) return l;
  }
  return [];
}

function decode(raw: string | null | undefined): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Parse the cookie defensively. Anything malformed yields an empty cart. */
export function parseCart(raw: string | null | undefined): CartLine[] {
  const entries = rawLines(decode(raw));

  // Merge duplicates rather than trusting the client to send distinct lines.
  const merged = new Map<string, CartLine>();
  for (const entry of entries) {
    if (typeof entry !== "object" || entry === null) continue;
    const slug = cleanSlug((entry as { slug?: unknown }).slug);
    if (!slug) continue;

    const theme = cleanSlug((entry as { theme?: unknown }).theme) ?? undefined;
    const qty = clampQty((entry as { qty?: unknown }).qty);

    const key = lineKey(slug, theme);
    const existing = merged.get(key);
    merged.set(
      key,
      makeLine(slug, Math.min(MAX_QTY, (existing?.qty ?? 0) + qty), theme),
    );
    if (merged.size >= MAX_LINES) break;
  }

  return [...merged.values()];
}

/**
 * The plan slug the cart is carrying, if any.
 *
 * Only the slug: whether that plan exists, is still on sale and what it costs
 * are all read from the database, exactly as a product line's price is.
 */
export function parseCartPlan(raw: string | null | undefined): string | null {
  const decoded = decode(raw);
  if (Array.isArray(decoded) || typeof decoded !== "object" || decoded === null) return null;
  return cleanSlug((decoded as { p?: unknown }).p);
}

export function serializeCart(lines: CartLine[], planSlug: string | null = null): string {
  return JSON.stringify({
    l: lines.map(({ slug, qty, theme }) => (theme ? { slug, qty, theme } : { slug, qty })),
    p: planSlug,
  });
}

export function addLine(
  lines: CartLine[],
  slug: string,
  qty = 1,
  theme?: string,
): CartLine[] {
  if (lines.some((l) => sameLine(l, slug, theme))) {
    return lines.map((l) =>
      sameLine(l, slug, theme)
        ? makeLine(slug, Math.min(MAX_QTY, l.qty + clampQty(qty)), theme)
        : l,
    );
  }
  if (lines.length >= MAX_LINES) return lines;
  return [...lines, makeLine(slug, clampQty(qty), theme)];
}

export function setLineQty(
  lines: CartLine[],
  slug: string,
  qty: number,
  theme?: string,
): CartLine[] {
  if (qty <= 0) return removeLine(lines, slug, theme);
  return lines.map((l) =>
    sameLine(l, slug, theme) ? makeLine(slug, clampQty(qty), theme) : l,
  );
}

export function removeLine(lines: CartLine[], slug: string, theme?: string): CartLine[] {
  return lines.filter((l) => !sameLine(l, slug, theme));
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((n, l) => n + l.qty, 0);
}
