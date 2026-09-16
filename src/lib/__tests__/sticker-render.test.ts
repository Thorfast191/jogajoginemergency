import { describe, it, expect } from "vitest";
import sharp from "sharp";
import jsQR from "jsqr";
import { PDFDocument } from "pdf-lib";
import { defaultArtworkSvg, renderSticker, stickerPdf, type StickerTheme } from "../sticker";
import { mmToPt, qrBox } from "../sticker-layout";

const theme: StickerTheme = {
  name: "Night Guardian",
  tagline: "Caped, watchful, and a little dramatic.",
  bgColor: "#111827",
  surfaceColor: "#1F2937",
  inkColor: "#F9FAFB",
  accentColor: "#FBBF24",
  qrBoxSize: 40,
};

const url = "https://jogajog.app/t/Ab3dEf7h";

/** Read the QR back out of the square the layout says it was put in. */
async function decodeBox(png: Buffer, width: number, height: number, sizePct: number) {
  const box = qrBox(width, height, sizePct);
  const { data, info } = await sharp(png)
    .extract({ left: box.left, top: box.top, width: box.size, height: box.size })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data ?? null;
}

async function solidPng(width: number, height: number, colour: string): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: colour } }).png().toBuffer();
}

describe("renderSticker", () => {
  // The test that matters: whatever the artwork does, a phone camera pointed
  // at the middle of the printed sticker has to land on this tag's page.
  it("puts a scannable QR for the tag's URL in the centre of generated artwork", async () => {
    const sticker = await renderSticker({ art: null, theme, url, maxEdge: 1200 });
    expect([sticker.width, sticker.height]).toEqual([1200, 1200]);
    expect(await decodeBox(sticker.png, sticker.width, sticker.height, theme.qrBoxSize)).toBe(url);
  });

  it("keeps uploaded artwork's proportions and still decodes", async () => {
    const art = await solidPng(1600, 1000, "#dc2626");
    const sticker = await renderSticker({ art, theme: { ...theme, qrBoxSize: 55 }, url });
    expect([sticker.width, sticker.height]).toEqual([1600, 1000]);
    expect(await decodeBox(sticker.png, 1600, 1000, 55)).toBe(url);
  });

  it("paints the square white edge to edge, so the quiet zone survives busy artwork", async () => {
    const art = await solidPng(1000, 1000, "#dc2626");
    const sticker = await renderSticker({ art, theme, url });
    const box = qrBox(1000, 1000, theme.qrBoxSize);
    const { data } = await sharp(sticker.png)
      .extract({ left: box.left, top: box.top, width: 1, height: 1 })
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect([data[0], data[1], data[2]]).toEqual([255, 255, 255]);
  });

  it("scales oversized artwork down to the print ceiling", async () => {
    const art = await solidPng(4000, 2000, "#0284c7");
    const sticker = await renderSticker({ art, theme, url, maxEdge: 2000 });
    expect([sticker.width, sticker.height]).toEqual([2000, 1000]);
  });
});

describe("defaultArtworkSvg — long and punctuated taglines", () => {
  // A tagline within the 140-character limit that wraps and truncates. Escaping
  // before truncating could slice "&apos;" in half and make librsvg reject the
  // whole document, so every sticker for the theme would fail to render.
  const long =
    "Please scan this QR if it's an emergency and you can't reach me — my sister's number is on the card, & the hospital's details follow";

  it("still produces a renderable sticker", async () => {
    const sticker = await renderSticker({ art: null, theme: { ...theme, tagline: long }, url, maxEdge: 900 });
    expect(sticker.width).toBe(900);
    expect(await decodeBox(sticker.png, 900, 900, theme.qrBoxSize)).toBe(url);
  });

  it("never leaves a half-written entity in the markup", () => {
    const svg = defaultArtworkSvg({ ...theme, tagline: long }, 900);
    // Every & must start a complete entity.
    expect(svg.match(/&(?!(amp|lt|gt|quot|apos|#\d+);)/g)).toBeNull();
  });
});

describe("defaultArtworkSvg", () => {
  it("escapes theme text, which admins type and the SVG renderer parses", () => {
    const svg = defaultArtworkSvg({ ...theme, tagline: `<script>alert("x")</script> & co` }, 800);
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;");
    expect(svg).toContain("&amp; co");
  });

  it("refuses a colour that is not a hex literal", () => {
    const svg = defaultArtworkSvg({ ...theme, bgColor: `red" onload="x` }, 800);
    expect(svg).not.toContain("onload");
  });
});

describe("stickerPdf", () => {
  it("lays out one real-size page per sticker", async () => {
    const one = await renderSticker({ art: null, theme, url, maxEdge: 600 });
    const two = await renderSticker({ art: await solidPng(800, 400, "#fff"), theme, url });
    const bytes = await stickerPdf([one, two], 60);

    expect(Buffer.from(bytes.slice(0, 4)).toString()).toBe("%PDF");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(2);

    const [first, second] = doc.getPages();
    expect(first.getWidth()).toBeCloseTo(mmToPt(60), 3);
    expect(first.getHeight()).toBeCloseTo(mmToPt(60), 3);
    // A 2:1 sticker keeps its proportions at the same printed width.
    expect(second.getHeight()).toBeCloseTo(mmToPt(30), 3);
  });
});
