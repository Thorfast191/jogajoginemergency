// Who may wear which skin.
//
// A theme belongs to the sticker product that carries it: buying the Helmet
// sticker is what unlocks Night Guardian. The one exception is the default
// theme, which every account has from the moment it exists — a customer who
// has bought nothing still gets a readable, branded scan page.
//
// Pure on purpose. The rule decides what a stranger sees on someone's
// emergency page, so it is testable without a database.

/**
 * The default theme's slug. A well-known slug rather than a schema flag: the
 * seed creates the row, `DEFAULT_THEME` in src/lib/themes.ts mirrors it for
 * when the row is missing, and both sides agree on this constant.
 */
export const DEFAULT_THEME_SLUG = "jogajog-emergency";

/** A paid order line, reduced to the only thing theme access cares about. */
export type PaidThemeLine = { themeId: string | null };

/** A product a locked theme could be bought through. */
export type UnlockingProduct = {
  slug: string;
  name: string;
  themeId: string | null;
  priceCents: number;
};

/**
 * The themes this customer may apply, as ids.
 *
 * `defaultThemeId` is null only when the default row is absent from the
 * database, in which case nothing is granted here and the renderer falls back
 * to the built-in constant.
 */
export function entitledThemeIds(
  paidLines: readonly PaidThemeLine[],
  defaultThemeId: string | null,
): Set<string> {
  const ids = new Set<string>();
  for (const line of paidLines) {
    if (line.themeId) ids.add(line.themeId);
  }
  if (defaultThemeId) ids.add(defaultThemeId);
  return ids;
}

/**
 * Whether a tag may be moved to this theme.
 *
 * `null` means "back to the default", which is always allowed — a customer
 * must never be stuck on a skin.
 */
export function canUseTheme(themeId: string | null, entitled: ReadonlySet<string>): boolean {
  if (themeId === null) return true;
  return entitled.has(themeId);
}

/**
 * The cheapest sticker on sale — the shortest route to any locked theme, now
 * that the artwork is chosen at checkout rather than fixed to the product.
 */
export function cheapestSticker(
  products: readonly UnlockingProduct[],
): UnlockingProduct | null {
  let best: UnlockingProduct | null = null;
  for (const p of products) {
    if (!best || p.priceCents < best.priceCents) best = p;
  }
  return best;
}
