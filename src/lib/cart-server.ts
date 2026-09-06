import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { CART_COOKIE, parseCart, serializeCart, type CartLine } from "@/lib/cart";

// Server-side cart access. Reading works anywhere; per the Next.js cookie
// rules, writing only works inside a Server Function or Route Handler, which
// is why every mutation lives in src/app/cart/actions.ts.

export async function readCart(): Promise<CartLine[]> {
  const store = await cookies();
  return parseCart(store.get(CART_COOKIE)?.value);
}

/** Write the cart cookie. Only valid from a Server Function / Route Handler. */
export async function writeCart(lines: CartLine[]): Promise<void> {
  const store = await cookies();
  if (lines.length === 0) {
    store.delete(CART_COOKIE);
    return;
  }
  store.set(CART_COOKIE, serializeCart(lines), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60,
  });
}

export type ResolvedLine = {
  productId: string;
  themeId: string | null;
  slug: string;
  name: string;
  qty: number;
  unitPriceCents: number;
  currency: string;
  imageAssetId: string | null;
  lineTotalCents: number;
};

export type ResolvedCart = {
  lines: ResolvedLine[];
  totalCents: number;
  currency: string;
  /** Slugs that were in the cookie but are no longer purchasable. */
  dropped: string[];
};

/**
 * Turn cookie lines into priced lines. Prices always come from the database —
 * the cookie carries a slug and a quantity and nothing else, so a tampered
 * cookie cannot change what anything costs.
 */
export async function resolveCart(lines: CartLine[]): Promise<ResolvedCart> {
  if (lines.length === 0) return { lines: [], totalCents: 0, currency: "BDT", dropped: [] };

  const products = await prisma.product.findMany({
    where: { slug: { in: lines.map((l) => l.slug) }, status: "ACTIVE" },
  });
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  const resolved: ResolvedLine[] = [];
  const dropped: string[] = [];
  for (const line of lines) {
    const product = bySlug.get(line.slug);
    if (!product) {
      dropped.push(line.slug);
      continue;
    }
    resolved.push({
      productId: product.id,
      themeId: product.themeId,
      slug: product.slug,
      name: product.name,
      qty: line.qty,
      unitPriceCents: product.priceCents,
      currency: product.currency,
      imageAssetId: product.imageAssetId,
      lineTotalCents: product.priceCents * line.qty,
    });
  }

  return {
    lines: resolved,
    totalCents: resolved.reduce((n, l) => n + l.lineTotalCents, 0),
    currency: resolved[0]?.currency ?? "BDT",
    dropped,
  };
}
