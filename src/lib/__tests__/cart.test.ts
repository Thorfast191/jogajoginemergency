import { describe, it, expect } from "vitest";
import {
  parseCart,
  parseCartPlan,
  serializeCart,
  addLine,
  setLineQty,
  removeLine,
  cartCount,
  MAX_QTY,
} from "../cart";

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

describe("the chosen artwork is part of a line's identity", () => {
  it("reads a theme off a line", () => {
    expect(parseCart('{"l":[{"slug":"bike","qty":1,"theme":"good-boy"}],"p":null}')).toEqual([
      { slug: "bike", qty: 1, theme: "good-boy" },
    ]);
  });

  it("leaves theme off entirely when there isn't one", () => {
    expect(parseCart('{"l":[{"slug":"bike","qty":1}],"p":null}')).toEqual([
      { slug: "bike", qty: 1 },
    ]);
  });

  it("drops a theme that isn't a usable slug", () => {
    expect(parseCart('{"l":[{"slug":"bike","qty":1,"theme":7}],"p":null}')).toEqual([
      { slug: "bike", qty: 1 },
    ]);
    expect(
      parseCart(JSON.stringify({ l: [{ slug: "bike", qty: 1, theme: "x".repeat(500) }], p: null })),
    ).toEqual([{ slug: "bike", qty: 1 }]);
  });

  it("keeps the same product in two themes as two lines", () => {
    const lines = addLine(addLine([], "bike", 1, "good-boy"), "bike", 1, "speedster");
    expect(lines).toEqual([
      { slug: "bike", qty: 1, theme: "good-boy" },
      { slug: "bike", qty: 1, theme: "speedster" },
    ]);
  });

  it("accumulates only onto the matching theme", () => {
    const lines = addLine(
      [
        { slug: "bike", qty: 1, theme: "good-boy" },
        { slug: "bike", qty: 1 },
      ],
      "bike",
      2,
      "good-boy",
    );
    expect(lines).toEqual([
      { slug: "bike", qty: 3, theme: "good-boy" },
      { slug: "bike", qty: 1 },
    ]);
  });

  it("merges duplicates per theme, not per slug", () => {
    expect(
      parseCart(
        '{"l":[{"slug":"a","qty":2,"theme":"t1"},{"slug":"a","qty":3,"theme":"t1"},{"slug":"a","qty":1}],"p":null}',
      ),
    ).toEqual([
      { slug: "a", qty: 5, theme: "t1" },
      { slug: "a", qty: 1 },
    ]);
  });

  it("removes and re-quantities the themed line only", () => {
    const lines = [
      { slug: "a", qty: 1, theme: "t1" },
      { slug: "a", qty: 4 },
    ];
    expect(removeLine(lines, "a", "t1")).toEqual([{ slug: "a", qty: 4 }]);
    expect(removeLine(lines, "a")).toEqual([{ slug: "a", qty: 1, theme: "t1" }]);
    expect(setLineQty(lines, "a", 2, "t1")).toEqual([
      { slug: "a", qty: 2, theme: "t1" },
      { slug: "a", qty: 4 },
    ]);
  });
});

describe("parseCartPlan — a plan rides in the same cookie", () => {
  it("reads the plan slug", () => {
    expect(parseCartPlan('{"l":[],"p":"plus"}')).toBe("plus");
  });

  it("is null when there is none, or when it isn't a usable slug", () => {
    expect(parseCartPlan('{"l":[],"p":null}')).toBeNull();
    expect(parseCartPlan('{"l":[]}')).toBeNull();
    expect(parseCartPlan('{"l":[],"p":""}')).toBeNull();
    expect(parseCartPlan('{"l":[],"p":12}')).toBeNull();
    expect(parseCartPlan(JSON.stringify({ l: [], p: "x".repeat(500) }))).toBeNull();
  });

  it("is null for absent, malformed and legacy cookies", () => {
    for (const raw of [undefined, null, "", "not json", '[{"slug":"a","qty":1}]']) {
      expect(parseCartPlan(raw)).toBeNull();
    }
  });

  it("round-trips lines and a plan together", () => {
    const lines = [{ slug: "a", qty: 2, theme: "t1" }, { slug: "b", qty: 1 }];
    const raw = serializeCart(lines, "plus");
    expect(parseCart(raw)).toEqual(lines);
    expect(parseCartPlan(raw)).toBe("plus");
  });
});

describe("cookies written before the cart carried a plan", () => {
  it("still reads a bare array of lines", () => {
    expect(parseCart('[{"slug":"bike","qty":2}]')).toEqual([{ slug: "bike", qty: 2 }]);
  });
});
