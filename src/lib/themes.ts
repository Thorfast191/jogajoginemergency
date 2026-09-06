// Theme resolution for the scan page and the tag theme picker.
//
// A theme spans two surfaces — the artwork printed on a sticker and the skin
// the scan page renders in. This module owns only the second one, plus the
// rules about who may use what.

export type ThemeTier = "FREE" | "PREMIUM";

export type ThemeSkin = {
  slug: string;
  name: string;
  tier: ThemeTier;
  bgColor: string;
  surfaceColor: string;
  inkColor: string;
  accentColor: string;
  mascot: string;
};

/** The cast of inline-SVG mascots a theme may point at. */
export const MASCOTS = ["BLOB", "GUARDIAN", "WEBBED", "SPARK", "ROVER"] as const;
export type MascotKey = (typeof MASCOTS)[number];

export const DEFAULT_THEME: ThemeSkin = {
  slug: "classic",
  name: "Classic",
  tier: "FREE",
  bgColor: "#FBF9F6",
  surfaceColor: "#FFFFFF",
  inkColor: "#171717",
  accentColor: "#059669",
  mascot: "BLOB",
};

/**
 * The skin a scan should actually render in.
 *
 * A premium skin on a lapsed account degrades to the default rather than
 * breaking or leaking. The tag's stored themeId is deliberately left alone, so
 * re-subscribing restores the look instead of losing it.
 */
export function resolveScanTheme(
  theme: ThemeSkin | null | undefined,
  entitled: boolean,
): ThemeSkin {
  if (!theme) return DEFAULT_THEME;
  if (theme.tier === "PREMIUM" && !entitled) return DEFAULT_THEME;
  return theme;
}

/** Whether an owner may choose this theme for one of their tags. */
export function canSelectTheme(theme: { tier: ThemeTier }, entitled: boolean): boolean {
  return theme.tier === "FREE" || entitled;
}

export function resolveMascot(key: string | null | undefined): MascotKey {
  return (MASCOTS as readonly string[]).includes(key ?? "") ? (key as MascotKey) : "BLOB";
}

// Theme colours are admin-entered and reach the page inside a style attribute.
// Only a plain hex literal is ever interpolated; anything else falls back to
// the default, so a malformed or hostile value cannot break out into CSS.
const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function hex(value: string, fallback: string): string {
  return HEX.test(value) ? value : fallback;
}

export function themeCssVars(skin: ThemeSkin): Record<string, string> {
  return {
    "--skin-bg": hex(skin.bgColor, DEFAULT_THEME.bgColor),
    "--skin-surface": hex(skin.surfaceColor, DEFAULT_THEME.surfaceColor),
    "--skin-ink": hex(skin.inkColor, DEFAULT_THEME.inkColor),
    "--skin-accent": hex(skin.accentColor, DEFAULT_THEME.accentColor),
  };
}
