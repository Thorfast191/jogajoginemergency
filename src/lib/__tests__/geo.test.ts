import { describe, it, expect } from "vitest";
import { approxLocationFrom, formatLocation } from "../geo";

const headers = (h: Record<string, string>) => ({
  get: (name: string) => h[name.toLowerCase()] ?? null,
});

describe("approxLocationFrom", () => {
  it("reads Cloudflare's headers", () => {
    expect(
      approxLocationFrom(headers({ "cf-ipcity": "Dhaka", "cf-ipcountry": "BD" })),
    ).toEqual({ approxCity: "Dhaka", approxRegion: null, approxCountry: "BD" });
  });

  it("reads Vercel's headers", () => {
    expect(
      approxLocationFrom(headers({ "x-vercel-ip-city": "Dhaka", "x-vercel-ip-country": "BD" }))
        .approxCity,
    ).toBe("Dhaka");
  });

  it("decodes percent-encoded values", () => {
    expect(approxLocationFrom(headers({ "cf-ipcity": "Cox%27s%20Bazar" })).approxCity).toBe(
      "Cox's Bazar",
    );
  });

  it("treats XX as unknown, which is what Cloudflare sends for anonymous IPs", () => {
    expect(approxLocationFrom(headers({ "cf-ipcountry": "XX" })).approxCountry).toBeNull();
  });

  it("returns nulls when the edge adds nothing, as in local development", () => {
    expect(approxLocationFrom(headers({}))).toEqual({
      approxCity: null,
      approxRegion: null,
      approxCountry: null,
    });
  });

  it("caps absurdly long values rather than storing them", () => {
    const long = approxLocationFrom(headers({ "cf-ipcity": "x".repeat(500) }));
    expect(long.approxCity?.length).toBe(80);
  });
});

describe("formatLocation", () => {
  it("joins the parts it has", () => {
    expect(
      formatLocation({ approxCity: "Dhaka", approxRegion: null, approxCountry: "Bangladesh" }),
    ).toBe("Dhaka, Bangladesh");
  });

  it("is null when nothing is known", () => {
    expect(
      formatLocation({ approxCity: null, approxRegion: null, approxCountry: null }),
    ).toBeNull();
  });
});
