import { prisma } from "@/lib/prisma";
import { DEFAULT_THEME_SLUG, entitledThemeIds } from "@/lib/theme-access";

/** The default theme row, or null if the seed has not created it yet. */
export async function defaultTheme() {
  return prisma.theme.findUnique({ where: { slug: DEFAULT_THEME_SLUG } });
}

/**
 * The theme ids this customer may apply: every theme carried by a product they
 * paid for, plus the default.
 *
 * Read from paid order lines rather than from their tags, so deleting a tag
 * never costs someone a theme they bought.
 */
export async function entitledThemeIdsForUser(userId: string): Promise<Set<string>> {
  const [lines, fallback] = await Promise.all([
    prisma.orderItem.findMany({
      where: { order: { userId, status: "PAID" } },
      select: { product: { select: { themeId: true } } },
    }),
    defaultTheme(),
  ]);

  return entitledThemeIds(
    lines.map((l) => ({ themeId: l.product.themeId })),
    fallback?.id ?? null,
  );
}
