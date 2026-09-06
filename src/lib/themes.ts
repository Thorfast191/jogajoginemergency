// Theme resolution for the scan page and the tag theme picker.
//
// A theme spans two surfaces — the artwork printed on a sticker and the skin
// the scan page renders in. This module owns only the second one, plus the
// rules about who may use what.

export type ThemeSkin = {
  slug: string;
  name: string;
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
  bgColor: "#FBF9F6",
  surfaceColor: "#FFFFFF",
  inkColor: "#171717",
  accentColor: "#059669",
  mascot: "BLOB",
};

/**
 * The skin a scan should render in. Themes are cosmetic: a subscription is
 * already required for the page to show anything, so every skin on a live page
 * is paid for by definition.
 */
export function resolveScanTheme(theme: ThemeSkin | null | undefined): ThemeSkin {
  return theme ?? DEFAULT_THEME;
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

/** Expand #abc / #abcd to their 6-digit form and return sRGB channels 0-255. */
function channels(value: string): [number, number, number] {
  let h = value.slice(1);
  if (h.length === 3 || h.length === 4) h = [...h.slice(0, 3)].map((c) => c + c).join("");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** WCAG relative luminance. */
function luminance(value: string): number {
  const [r, g, b] = channels(value).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colours, 1 (identical) to 21. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

const AA_NORMAL = 4.5;
const AA_LARGE = 3;
const SAFE_DARK = "#111111";
const SAFE_LIGHT = "#FFFFFF";

/**
 * Guarantee text remains readable on its surface.
 *
 * Theme colours are admin-entered, and the scan page is read by a stranger who
 * may be looking at someone's blood group in an emergency. A theme that fails
 * contrast is corrected rather than shipped: better an off-brand card than an
 * unreadable one.
 */
function readableInk(ink: string, surface: string, minimum: number): string {
  if (contrastRatio(ink, surface) >= minimum) return ink;
  return contrastRatio(SAFE_LIGHT, surface) >= contrastRatio(SAFE_DARK, surface)
    ? SAFE_LIGHT
    : SAFE_DARK;
}

export function themeCssVars(skin: ThemeSkin): Record<string, string> {
  const surface = hex(skin.surfaceColor, DEFAULT_THEME.surfaceColor);
  const ink = readableInk(hex(skin.inkColor, DEFAULT_THEME.inkColor), surface, AA_NORMAL);

  // Secondary text (labels, hints) is derived from the guaranteed-readable ink
  // rather than from a fixed black, so it stays legible on a dark skin too.
  const muted = mix(ink, surface, 0.35);
  const accent = readableInk(hex(skin.accentColor, DEFAULT_THEME.accentColor), surface, AA_LARGE);

  return {
    "--skin-bg": hex(skin.bgColor, DEFAULT_THEME.bgColor),
    "--skin-surface": surface,
    "--skin-ink": ink,
    "--skin-muted": readableInk(muted, surface, AA_LARGE),
    // Hairlines and dividers: ink barely blended into the surface, so borders
    // stay visible on a dark skin instead of vanishing like black-on-black.
    "--skin-line": mix(ink, surface, 0.86),
    "--skin-accent": accent,
    // Whatever sits on top of the accent — the finder's primary button — has
    // to be readable against it. White is preferred because that is what a
    // solid-colour button conventionally looks like, and it only gives way to
    // dark ink when it actually fails the large-text threshold. Picking the
    // mathematically higher contrast instead would put black text on a mid
    // green, which passes but reads as a mistake.
    "--skin-on-accent": contrastRatio(SAFE_LIGHT, accent) >= AA_LARGE ? SAFE_LIGHT : SAFE_DARK,
  };
}

/** Blend `amount` of `b` into `a`. */
function mix(a: string, b: string, amount: number): string {
  const [ar, ag, ab] = channels(a);
  const [br, bg, bb] = channels(b);
  const c = (x: number, y: number) =>
    Math.round(x + (y - x) * amount)
      .toString(16)
      .padStart(2, "0");
  return `#${c(ar, br)}${c(ag, bg)}${c(ab, bb)}`;
}
