import { describe, it, expect } from "vitest";
import {
  DEFAULT_THEME_SLUG,
  entitledThemeIds,
  canUseTheme,
  unlockedBy,
} from "../theme-access";

describe("entitledThemeIds", () => {
  it("grants every theme carried by a paid line", () => {
    const ids = entitledThemeIds(
      [{ themeId: "night" }, { themeId: "sunrise" }],
      "default-id",
    );
    expect([...ids].sort()).toEqual(["default-id", "night", "sunrise"]);
  });

  it("always grants the default theme, even with no purchases", () => {
    expect([...entitledThemeIds([], "default-id")]).toEqual(["default-id"]);
  });

  it("ignores lines whose product carries no theme", () => {
    expect([...entitledThemeIds([{ themeId: null }], "default-id")]).toEqual(["default-id"]);
  });

  it("does not invent a default when the default theme row is missing", () => {
    expect([...entitledThemeIds([], null)]).toEqual([]);
  });

  it("deduplicates a theme bought twice", () => {
    const ids = entitledThemeIds([{ themeId: "night" }, { themeId: "night" }], null);
    expect([...ids]).toEqual(["night"]);
  });
});

describe("canUseTheme", () => {
  const entitled = new Set(["default-id", "night"]);

  it("allows a theme the customer paid for", () => {
    expect(canUseTheme("night", entitled)).toBe(true);
  });

  it("refuses a theme the customer never bought", () => {
    expect(canUseTheme("speedster", entitled)).toBe(false);
  });

  it("allows clearing back to the default", () => {
    expect(canUseTheme(null, entitled)).toBe(true);
  });

  // The whole point of the gate: an unpaid account gets the default and
  // nothing else, however the request is shaped.
  it("refuses everything but the default for an account with no purchases", () => {
    const bare = entitledThemeIds([], "default-id");
    expect(canUseTheme("night", bare)).toBe(false);
    expect(canUseTheme("default-id", bare)).toBe(true);
  });
});

describe("unlockedBy", () => {
  it("names the cheapest active product that carries the theme", () => {
    const product = unlockedBy("night", [
      { slug: "helmet", name: "Helmet Sticker", themeId: "night", priceCents: 29900 },
      { slug: "bundle", name: "Night Bundle", themeId: "night", priceCents: 19900 },
      { slug: "bike", name: "Bike Sticker", themeId: "classic", priceCents: 9900 },
    ]);
    expect(product?.slug).toBe("bundle");
  });

  it("returns null when nothing on sale carries it", () => {
    expect(unlockedBy("ghost", [])).toBeNull();
  });
});

describe("DEFAULT_THEME_SLUG", () => {
  it("is the well-known slug the seed and the renderer agree on", () => {
    expect(DEFAULT_THEME_SLUG).toBe("jogajog-emergency");
  });
});
