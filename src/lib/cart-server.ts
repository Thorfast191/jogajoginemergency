import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  CART_COOKIE,
  parseCart,
  parseCartPlan,
  serializeCart,
  type CartLine,
} from "@/lib/cart";

// Server-side cart access. Reading works anywhere; per the Next.js cookie
// rules, writing only works inside a Server Function or Route Handler, which
// is why every mutation lives in src/app/cart/actions.ts.

export async function readCart(): Promise<CartLine[]> {
  const store = await cookies();
  return parseCart(store.get(CART_COOKIE)?.value);
}

/** The plan slug the cart is carrying, before it is checked against the database. */
export async function readCartPlanSlug(): Promise<string | null> {
  const store = await cookies();
  return parseCartPlan(store.get(CART_COOKIE)?.value);
}

/** Write the cart cookie. Only valid from a Server Function / Route Handler. */
export async function writeCart(
  lines: CartLine[],
  planSlug: string | null = null,
): Promise<void> {
  const store = await cookies();
  if (lines.length === 0 && !planSlug) {
    store.delete(CART_COOKIE);
    return;
  }
  store.set(CART_COOKIE, serializeCart(lines, planSlug), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60,
  });
}

export type ResolvedLine = {
  productId: string;
  /** The theme this line will be printed in: the buyer's pick, else the product's. */
  themeId: string | null;
  /** Set only when the buyer chose a theme other than the product's own. */
  themeSlug: string | null;
  themeName: string | null;
  slug: string;
  name: string;
  qty: number;
  unitPriceCents: number;
  currency: string;
  imageAssetId: string | null;
  lineTotalCents: number;
};

export type ResolvedPlan = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  currency: string;
  intervalMonths: number;
  features: string[];
};

export type ResolvedCart = {
  lines: ResolvedLine[];
  /** A plan added to this checkout, once confirmed to be on sale. */
  plan: ResolvedPlan | null;
  /** The stickers alone. */
  goodsCents: number;
  /** Stickers plus the plan — what the customer pays. */
  totalCents: number;
  currency: string;
  /** Slugs that were in the cookie but are no longer purchasable. */
  dropped: string[];
  /** True when the cookie named a plan that is no longer on sale. */
  planDropped: boolean;
};

const EMPTY: ResolvedCart = {
  lines: [],
  plan: null,
  goodsCents: 0,
  totalCents: 0,
  currency: "BDT",
  dropped: [],
  planDropped: false,
};

/**
 * Turn cookie lines into priced lines. Prices always come from the database —
 * the cookie carries slugs and a quantity and nothing else, so a tampered
 * cookie cannot change what anything costs.
 *
 * The chosen theme is resolved the same way: the cookie names a slug, and a
 * theme that isn't live falls back to the one the product carries rather than
 * failing the line. Nobody loses a sticker because an artwork was retired.
 */
export async function resolveCart(
  lines: CartLine[],
  planSlug: string | null = null,
): Promise<ResolvedCart> {
  if (lines.length === 0 && !planSlug) return EMPTY;

  const themeSlugs = [...new Set(lines.map((l) => l.theme).filter((t): t is string => !!t))];

  const [products, themes, plan] = await Promise.all([
    lines.length
      ? prisma.product.findMany({
          where: { slug: { in: lines.map((l) => l.slug) }, status: "ACTIVE" },
        })
      : [],
    themeSlugs.length
      ? prisma.theme.findMany({
          where: { slug: { in: themeSlugs }, status: "ACTIVE" },
          select: { id: true, slug: true, name: true },
        })
      : [],
    planSlug
      ? prisma.subscriptionPlan.findFirst({
          where: { slug: planSlug, isActive: true },
          select: {
            id: true,
            slug: true,
            name: true,
            priceCents: true,
            currency: true,
            intervalMonths: true,
            features: true,
          },
        })
      : null,
  ]);

  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const themeBySlug = new Map(themes.map((t) => [t.slug, t]));

  const resolved: ResolvedLine[] = [];
  const dropped: string[] = [];
  for (const line of lines) {
    const product = bySlug.get(line.slug);
    if (!product) {
      dropped.push(line.slug);
      continue;
    }
    const picked = line.theme ? themeBySlug.get(line.theme) : undefined;
    resolved.push({
      productId: product.id,
      themeId: picked?.id ?? product.themeId,
      themeSlug: picked?.slug ?? null,
      themeName: picked?.name ?? null,
      slug: product.slug,
      name: product.name,
      qty: line.qty,
      unitPriceCents: product.priceCents,
      currency: product.currency,
      imageAssetId: product.imageAssetId,
      lineTotalCents: product.priceCents * line.qty,
    });
  }

  const goodsCents = resolved.reduce((n, l) => n + l.lineTotalCents, 0);
  return {
    lines: resolved,
    plan,
    goodsCents,
    totalCents: goodsCents + (plan?.priceCents ?? 0),
    currency: resolved[0]?.currency ?? plan?.currency ?? "BDT",
    dropped,
    planDropped: !!planSlug && !plan,
  };
}

/** Read and resolve in one step — the cookie's lines and its plan together. */
export async function readResolvedCart(): Promise<ResolvedCart> {
  const [lines, planSlug] = await Promise.all([readCart(), readCartPlanSlug()]);
  return resolveCart(lines, planSlug);
}

/**
 * The cookie's lines that can still be bought — an archived, drafted or
 * unknown product is left out.
 *
 * The cookie itself keeps whatever it was given until it is next written, so
 * anything that counts or changes the cart starts from this: the header badge
 * said "Cart 1" over an empty cart once the only product in it was archived.
 */
export async function readLiveCart(): Promise<{ lines: CartLine[]; planSlug: string | null }> {
  const cart = await readResolvedCart();
  return {
    lines: cart.lines.map(({ slug, qty, themeSlug }) =>
      themeSlug ? { slug, qty, theme: themeSlug } : { slug, qty },
    ),
    planSlug: cart.plan?.slug ?? null,
  };
}
