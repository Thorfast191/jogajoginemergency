import { describe, it, expect } from "vitest";
import {
  DEFAULT_THEME,
  resolveScanTheme,
  canSelectTheme,
  themeCssVars,
  contrastRatio,
  resolveMascot,
  type ThemeSkin,
} from "../themes";

const freeTheme: ThemeSkin = {
  slug: "sunrise",
  name: "Sunrise",
  tier: "FREE",
  bgColor: "#FFF7ED",
  surfaceColor: "#FFFFFF",
  inkColor: "#1F2937",
  accentColor: "#EA580C",
  mascot: "BLOB",
};

const premiumTheme: ThemeSkin = { ...freeTheme, slug: "night-guardian", tier: "PREMIUM", mascot: "GUARDIAN" };

describe("resolveScanTheme", () => {
  it("falls back to the default when a tag has no theme", () => {
    expect(resolveScanTheme(null, true)).toEqual(DEFAULT_THEME);
    expect(resolveScanTheme(undefined, false)).toEqual(DEFAULT_THEME);
  });

  it("renders a free theme regardless of subscription", () => {
    expect(resolveScanTheme(freeTheme, false)).toEqual(freeTheme);
    expect(resolveScanTheme(freeTheme, true)).toEqual(freeTheme);
  });

  it("renders a premium theme for an entitled owner", () => {
    expect(resolveScanTheme(premiumTheme, true)).toEqual(premiumTheme);
  });

  it("degrades a premium theme to the default when the owner has lapsed", () => {
    // The tag keeps its themeId in the database; only the render degrades, so
    // re-subscribing restores the look instead of losing it.
    expect(resolveScanTheme(premiumTheme, false)).toEqual(DEFAULT_THEME);
  });

  it("never returns a premium skin to an unentitled viewer", () => {
    expect(resolveScanTheme(premiumTheme, false).tier).toBe("FREE");
  });
});

describe("canSelectTheme", () => {
  it("lets anyone pick a free theme", () => {
    expect(canSelectTheme(freeTheme, false)).toBe(true);
  });
  it("gates premium themes behind a subscription", () => {
    expect(canSelectTheme(premiumTheme, false)).toBe(false);
    expect(canSelectTheme(premiumTheme, true)).toBe(true);
  });
});

describe("themeCssVars", () => {
  it("exposes every skin token as a custom property", () => {
    const vars = themeCssVars(freeTheme);
    expect(vars["--skin-bg"]).toBe("#FFF7ED");
    expect(vars["--skin-surface"]).toBe("#FFFFFF");
    expect(vars["--skin-ink"]).toBe("#1F2937");
    expect(vars["--skin-accent"]).toBe("#EA580C");
    expect(vars["--skin-muted"]).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("drops a colour that isn't a plain hex value", () => {
    // Theme colours reach the page inside a style attribute; anything that
    // isn't a hex literal is discarded rather than interpolated.
    const vars = themeCssVars({ ...freeTheme, accentColor: "red; background:url(x)" });
    expect(vars["--skin-accent"]).toBe(DEFAULT_THEME.accentColor);
  });

  it("accepts 3- and 8-digit hex", () => {
    expect(themeCssVars({ ...freeTheme, bgColor: "#FFF" })["--skin-bg"]).toBe("#FFF");
    expect(themeCssVars({ ...freeTheme, bgColor: "#FFAA00CC" })["--skin-bg"]).toBe("#FFAA00CC");
  });
});

describe("resolveMascot", () => {
  it("returns a known mascot key unchanged", () => {
    expect(resolveMascot("GUARDIAN")).toBe("GUARDIAN");
  });
  it("falls back to the blob for anything unknown", () => {
    expect(resolveMascot("BATMAN")).toBe("BLOB");
    expect(resolveMascot(null)).toBe("BLOB");
  });
});

// --- Contrast guard -------------------------------------------------------
// Theme colours are admin-entered. The scan page is read by a stranger in an
// emergency, so an unreadable ink/surface pair must be corrected, not shipped.

describe("themeCssVars — ink is forced to stay readable on its surface", () => {
  const skin = (surface: string, ink: string): ThemeSkin => ({
    ...DEFAULT_THEME,
    surfaceColor: surface,
    inkColor: ink,
  });

  it("keeps a legible pairing untouched", () => {
    expect(themeCssVars(skin("#FFFFFF", "#171717"))["--skin-ink"]).toBe("#171717");
    expect(themeCssVars(skin("#111827", "#F9FAFB"))["--skin-ink"]).toBe("#F9FAFB");
  });

  it("replaces dark ink on a dark surface with white", () => {
    expect(themeCssVars(skin("#1F2937", "#171717"))["--skin-ink"]).toBe("#FFFFFF");
  });

  it("replaces light ink on a light surface with near-black", () => {
    expect(themeCssVars(skin("#FFFFFF", "#F5F5F5"))["--skin-ink"]).toBe("#111111");
  });

  it("rescues the degenerate identical-colour case", () => {
    const vars = themeCssVars(skin("#808080", "#808080"));
    expect(vars["--skin-ink"]).not.toBe("#808080");
  });

  it("also exposes a muted ink that is still readable", () => {
    const vars = themeCssVars(skin("#111827", "#F9FAFB"));
    expect(vars["--skin-muted"]).toBeDefined();
  });
});

describe("contrastRatio", () => {
  it("scores black on white at the maximum", () => {
    expect(Math.round(contrastRatio("#000000", "#FFFFFF"))).toBe(21);
  });
  it("scores a colour against itself at 1", () => {
    expect(contrastRatio("#3B82F6", "#3B82F6")).toBeCloseTo(1, 5);
  });
  it("is symmetric", () => {
    expect(contrastRatio("#111827", "#F9FAFB")).toBeCloseTo(contrastRatio("#F9FAFB", "#111827"), 5);
  });
});

describe("themeCssVars — text sitting on the accent colour", () => {
  const withAccent = (accent: string): ThemeSkin => ({ ...DEFAULT_THEME, accentColor: accent });

  it("uses white on a dark accent", () => {
    expect(themeCssVars(withAccent("#0F9D76"))["--skin-on-accent"]).toBe("#FFFFFF");
  });

  it("uses near-black on a pale accent", () => {
    // A pale accent with white text would make the primary call to action —
    // the button a finder taps — unreadable. The accent must sit on a dark
    // surface to survive the earlier contrast correction, which is exactly the
    // dark-theme case where a pale accent is a natural choice.
    const paleOnDark: ThemeSkin = {
      ...DEFAULT_THEME,
      surfaceColor: "#1F2937",
      inkColor: "#F9FAFB",
      accentColor: "#FFE066",
    };
    const vars = themeCssVars(paleOnDark);
    expect(vars["--skin-accent"]).toBe("#FFE066");
    expect(vars["--skin-on-accent"]).toBe("#111111");
  });
});
