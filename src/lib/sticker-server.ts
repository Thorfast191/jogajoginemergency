import { prisma } from "@/lib/prisma";
import { tagUrl } from "@/lib/qr";
import { appUrl } from "@/lib/payments/config";
import { DEFAULT_THEME } from "@/lib/themes";
import { defaultTheme } from "@/lib/theme-access-server";
import { QR_BOX_DEFAULT } from "@/lib/sticker-layout";
import { renderSticker, type RenderedSticker, type StickerTheme } from "@/lib/sticker";

// Loading what a sticker needs from the database. Rendering lives in
// src/lib/sticker.ts; access decisions live in the route handlers, which call
// `loadTagSticker` first (cheap) and only render once the caller is allowed.

const THUMB_EDGE = 480;
const PREVIEW_EDGE = 900;
const DEFAULT_WIDTH_MM = 60;

const themeSelect = {
  name: true,
  tagline: true,
  bgColor: true,
  surfaceColor: true,
  inkColor: true,
  accentColor: true,
  qrBoxSize: true,
  artAssetId: true,
} as const;

type ThemeRow = StickerTheme & { artAssetId: string | null };

export type TagSticker = {
  id: string;
  shortCode: string;
  userId: string;
  status: string;
  widthMm: number;
  theme: ThemeRow;
};

async function artBytes(assetId: string | null): Promise<Buffer | null> {
  if (!assetId) return null;
  const asset = await prisma.mediaAsset.findUnique({ where: { id: assetId }, select: { data: true } });
  return asset ? Buffer.from(asset.data) : null;
}

/**
 * The skin a tag's sticker prints in: its own theme, else the default theme
 * row, else the built-in constant — the same fallback chain the scan page uses.
 */
async function resolveTheme(theme: ThemeRow | null): Promise<ThemeRow> {
  if (theme) return theme;
  const row = await defaultTheme();
  if (row) return row;
  return { ...DEFAULT_THEME, qrBoxSize: QR_BOX_DEFAULT, artAssetId: null };
}

/** Everything needed to authorize and render a tag's sticker, or null. */
export async function loadTagSticker(tagId: string): Promise<TagSticker | null> {
  const tag = await prisma.tag.findUnique({
    where: { id: tagId },
    select: {
      id: true,
      shortCode: true,
      userId: true,
      status: true,
      product: { select: { stickerWidthMm: true } },
      theme: { select: themeSelect },
    },
  });
  if (!tag) return null;

  return {
    id: tag.id,
    shortCode: tag.shortCode,
    userId: tag.userId,
    status: tag.status,
    widthMm: tag.product?.stickerWidthMm ?? DEFAULT_WIDTH_MM,
    theme: await resolveTheme(tag.theme),
  };
}

/** Render a loaded tag's sticker at print size, or as a small thumbnail. */
export async function renderTagSticker(
  tag: TagSticker,
  { thumb = false }: { thumb?: boolean } = {},
): Promise<RenderedSticker & { widthMm: number }> {
  const sticker = await renderSticker({
    art: await artBytes(tag.theme.artAssetId),
    theme: tag.theme,
    url: tagUrl(tag.shortCode),
    maxEdge: thumb ? THUMB_EDGE : undefined,
  });
  return { ...sticker, widthMm: tag.widthMm };
}

/**
 * A theme's artwork with a sample QR in the square, for the storefront and the
 * admin editor. The sample points at the demo scan page, never at anyone's
 * real profile.
 */
export async function renderThemePreview(themeId: string) {
  const theme = await prisma.theme.findUnique({
    where: { id: themeId },
    select: { ...themeSelect, slug: true, status: true, updatedAt: true },
  });
  if (!theme) return null;

  const sticker = await renderSticker({
    art: await artBytes(theme.artAssetId),
    theme,
    url: `${appUrl()}/demo?theme=${encodeURIComponent(theme.slug)}`,
    maxEdge: PREVIEW_EDGE,
  });
  return { ...sticker, status: theme.status, updatedAt: theme.updatedAt };
}
