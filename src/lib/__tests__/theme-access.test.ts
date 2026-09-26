import { describe, it, expect } from "vitest";
import {
  DEFAULT_THEME_SLUG,
  entitledThemeIds,
  canUseTheme,
  cheapestSticker,
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


describe("DEFAULT_THEME_SLUG", () => {
  it("is the well-known slug the seed and the renderer agree on", () => {
    expect(DEFAULT_THEME_SLUG).toBe("jogajog-emergency");
  });
});

describe("cheapestSticker — the shortest route to a locked theme", () => {
  const p = (slug: string, priceCents: number, themeId: string | null = null) => ({
    slug,
    name: slug,
    themeId,
    priceCents,
  });

  it("picks the lowest price, whatever theme it carries", () => {
    expect(cheapestSticker([p("bike", 29900, "classic"), p("luggage", 24900, "web")])?.slug).toBe(
      "luggage",
    );
  });

  it("counts a sticker that carries no theme of its own", () => {
    expect(cheapestSticker([p("bike", 29900, "classic"), p("plain", 19900, null)])?.slug).toBe(
      "plain",
    );
  });

  it("is null when nothing is on sale", () => {
    expect(cheapestSticker([])).toBeNull();
  });
});
