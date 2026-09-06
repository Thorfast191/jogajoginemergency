import { describe, it, expect } from "vitest";
import { parseCart, serializeCart, addLine, setLineQty, removeLine, cartCount, MAX_QTY } from "../cart";

describe("parseCart — the cookie is user-controlled, so trust nothing", () => {
  it("reads a well-formed cart", () => {
    expect(parseCart('[{"slug":"bike","qty":2}]')).toEqual([{ slug: "bike", qty: 2 }]);
  });

  it("returns empty for absent or unparseable input", () => {
    for (const raw of [undefined, null, "", "not json", "{}", '"a string"', "[1,2,3]"]) {
      expect(parseCart(raw)).toEqual([]);
    }
  });

  it("drops entries with a missing or non-string slug", () => {
    expect(parseCart('[{"qty":1},{"slug":5,"qty":1},{"slug":"ok","qty":1}]')).toEqual([
      { slug: "ok", qty: 1 },
    ]);
  });

  it("clamps quantity into range", () => {
    expect(parseCart('[{"slug":"a","qty":9999}]')).toEqual([{ slug: "a", qty: MAX_QTY }]);
    expect(parseCart('[{"slug":"a","qty":0}]')).toEqual([{ slug: "a", qty: 1 }]);
    expect(parseCart('[{"slug":"a","qty":-3}]')).toEqual([{ slug: "a", qty: 1 }]);
    expect(parseCart('[{"slug":"a","qty":"lots"}]')).toEqual([{ slug: "a", qty: 1 }]);
  });

  it("merges duplicate slugs rather than trusting the client's shape", () => {
    expect(parseCart('[{"slug":"a","qty":2},{"slug":"a","qty":3}]')).toEqual([
      { slug: "a", qty: 5 },
    ]);
  });

  it("caps the number of distinct lines", () => {
    const many = JSON.stringify(
      Array.from({ length: 50 }, (_, i) => ({ slug: `p${i}`, qty: 1 })),
    );
    expect(parseCart(many).length).toBeLessThanOrEqual(10);
  });

  it("rejects absurdly long slugs", () => {
    expect(parseCart(JSON.stringify([{ slug: "x".repeat(500), qty: 1 }]))).toEqual([]);
  });
});

describe("cart mutations", () => {
  it("adds a new line", () => {
    expect(addLine([], "bike", 1)).toEqual([{ slug: "bike", qty: 1 }]);
  });

  it("accumulates onto an existing line, clamped", () => {
    expect(addLine([{ slug: "bike", qty: 2 }], "bike", 3)).toEqual([{ slug: "bike", qty: 5 }]);
    expect(addLine([{ slug: "bike", qty: 9 }], "bike", 9)).toEqual([{ slug: "bike", qty: MAX_QTY }]);
  });

  it("sets an exact quantity", () => {
    expect(setLineQty([{ slug: "a", qty: 1 }], "a", 4)).toEqual([{ slug: "a", qty: 4 }]);
  });

  it("removes a line when its quantity drops to zero", () => {
    expect(setLineQty([{ slug: "a", qty: 1 }], "a", 0)).toEqual([]);
  });

  it("removes a line outright", () => {
    expect(removeLine([{ slug: "a", qty: 1 }, { slug: "b", qty: 1 }], "a")).toEqual([
      { slug: "b", qty: 1 },
    ]);
  });

  it("counts total items, not lines", () => {
    expect(cartCount([{ slug: "a", qty: 2 }, { slug: "b", qty: 3 }])).toBe(5);
  });

  it("round-trips through serialize/parse", () => {
    const lines = [{ slug: "a", qty: 2 }, { slug: "b", qty: 1 }];
    expect(parseCart(serializeCart(lines))).toEqual(lines);
  });
});
