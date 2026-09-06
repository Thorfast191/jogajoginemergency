import { describe, it, expect } from "vitest";
import {
  DEFAULT_THEME,
  resolveScanTheme,
  canSelectTheme,
  themeCssVars,
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
    expect(vars).toEqual({
      "--skin-bg": "#FFF7ED",
      "--skin-surface": "#FFFFFF",
      "--skin-ink": "#1F2937",
      "--skin-accent": "#EA580C",
    });
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
