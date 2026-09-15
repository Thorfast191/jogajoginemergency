// Building a printable sticker: theme artwork with the customer's QR in the
// empty square at its centre.
//
// Rendered on demand and never stored, so replacing a theme's artwork or
// resizing its square changes every sticker at once. The QR is always black on
// white with a quiet zone inside the square — the one part of the design that
// has to work on every phone camera, whatever the artwork around it does.

import sharp from "sharp";
import QRCode from "qrcode";
import { PDFDocument } from "pdf-lib";
import { mmToPt, qrBox } from "./sticker-layout";

export type StickerTheme = {
  name: string;
  tagline: string;
  bgColor: string;
  surfaceColor: string;
  inkColor: string;
  accentColor: string;
  qrBoxSize: number;
};

export type RenderedSticker = { png: Buffer; width: number; height: number };

/** Longest edge of a print render. Enough for a 60–100 mm sticker at 600 dpi. */
const DEFAULT_MAX_EDGE = 2400;

/** White modules kept around the code inside the square. */
const QUIET_MODULES = 2;

// Theme colours and text are admin-entered and end up inside SVG markup that
// librsvg parses, so colours must be plain hex and text must be escaped.
const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function hex(value: string, fallback: string): string {
  return HEX.test(value) ? value : fallback;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Print fonts rarely carry emoji, and a tofu box on a sticker is worse than no
 * emoji at all — so pictographs are dropped from printed text.
 */
function printable(text: string): string {
  return text.replace(/\p{Extended_Pictographic}|️/gu, "").replace(/\s+/g, " ").trim();
}

/** Greedy word wrap into at most `maxLines`, with an ellipsis if it overflows. */
function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(" ")) {
    if (!word) continue;
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars || !current) {
      current = next;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length === maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  const used = lines.join(" ").length;
  if (used < text.length && lines.length > 0) {
    const last = lines[lines.length - 1];
    lines[lines.length - 1] = `${last.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
  }
  return lines.map((l) => (l.length > maxChars ? `${l.slice(0, maxChars - 1)}…` : l));
}

/**
 * Artwork for a theme nobody has uploaded a design for yet: the theme's
 * colours, the wordmark and an emergency emblem above, the empty square in the
 * middle, and the tagline beneath.
 */
export function defaultArtworkSvg(theme: StickerTheme, size: number): string {
  const bg = hex(theme.bgColor, "#FBF9F6");
  const surface = hex(theme.surfaceColor, "#FFFFFF");
  const ink = hex(theme.inkColor, "#171717");
  const accent = hex(theme.accentColor, "#059669");

  const box = qrBox(size, size, theme.qrBoxSize);
  const band = box.top; // space above (and below) the square
  const inset = Math.round(size * 0.04);
  const radius = Math.round(size * 0.06);
  const frame = Math.round(size * 0.018);

  const wordSize = Math.max(10, Math.round(Math.min(size * 0.05, band * 0.24)));
  const emblem = Math.round(Math.min(size * 0.09, band * 0.38));
  const emblemY = Math.round(band * 0.5 - (emblem + wordSize * 1.3) / 2);
  const wordY = emblemY + emblem + Math.round(wordSize * 1.15);

  const tagSize = Math.max(9, Math.round(Math.min(size * 0.036, band * 0.2)));
  const maxChars = Math.max(12, Math.floor((size * 0.84) / (tagSize * 0.55)));
  const tagLines = wrap(escapeXml(printable(theme.tagline)), maxChars, 2);
  const tagTop = box.top + box.size + Math.round(band * 0.5 - (tagLines.length * tagSize * 1.25) / 2);

  const cx = size / 2;
  const plus = Math.round(emblem * 0.22);
  const bar = Math.round(emblem * 0.16);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${bg}"/>
  <rect x="${inset}" y="${inset}" width="${size - inset * 2}" height="${size - inset * 2}" rx="${radius}" fill="${surface}"/>
  <g transform="translate(${cx - emblem / 2} ${emblemY})">
    <rect width="${emblem}" height="${emblem}" rx="${Math.round(emblem * 0.28)}" fill="${accent}"/>
    <rect x="${emblem / 2 - bar / 2}" y="${emblem / 2 - plus - bar / 2}" width="${bar}" height="${plus * 2 + bar}" rx="${bar / 3}" fill="#FFFFFF"/>
    <rect x="${emblem / 2 - plus - bar / 2}" y="${emblem / 2 - bar / 2}" width="${plus * 2 + bar}" height="${bar}" rx="${bar / 3}" fill="#FFFFFF"/>
  </g>
  <text x="${cx}" y="${wordY}" text-anchor="middle" font-family="DejaVu Sans, Helvetica, Arial, sans-serif" font-size="${wordSize}" font-weight="700" letter-spacing="${Math.round(wordSize * 0.12)}" fill="${accent}">JOGAJOG EMERGENCY</text>
  <rect x="${box.left - frame * 2}" y="${box.top - frame * 2}" width="${box.size + frame * 4}" height="${box.size + frame * 4}" rx="${frame * 2}" fill="#FFFFFF" stroke="${accent}" stroke-width="${frame}"/>
  ${tagLines
    .map(
      (line, i) =>
        `<text x="${cx}" y="${Math.round(tagTop + tagSize * (i + 1) * 1.15)}" text-anchor="middle" font-family="DejaVu Sans, Helvetica, Arial, sans-serif" font-size="${tagSize}" fill="${ink}">${line}</text>`,
    )
    .join("\n  ")}
</svg>`;
}

/**
 * The QR as an SVG exactly `size` pixels square: a white field, and black
 * modules drawn at a whole number of pixels each so the print has no blurred
 * module edges. Runs of dark modules in a row are merged into one rectangle.
 */
function qrSquareSvg(url: string, size: number): string {
  const { modules } = QRCode.create(url, { errorCorrectionLevel: "Q" });
  const count = modules.size;
  const total = count + QUIET_MODULES * 2;
  const px = Math.max(1, Math.floor(size / total));
  const offset = Math.floor((size - px * total) / 2) + QUIET_MODULES * px;

  let d = "";
  for (let row = 0; row < count; row++) {
    let col = 0;
    while (col < count) {
      if (!modules.get(row, col)) {
        col++;
        continue;
      }
      const start = col;
      while (col < count && modules.get(row, col)) col++;
      d += `M${offset + start * px} ${offset + row * px}h${(col - start) * px}v${px}h-${(col - start) * px}z`;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#FFFFFF"/><path fill="#000000" d="${d}"/></svg>`;
}

/**
 * Composite the QR for `url` into the centre square of the artwork.
 *
 * Uploaded artwork keeps its proportions and is only ever scaled down, to
 * `maxEdge`. Transparent artwork is flattened onto white, because that is what
 * it will be printed on.
 */
export async function renderSticker({
  art,
  theme,
  url,
  maxEdge = DEFAULT_MAX_EDGE,
}: {
  art: Buffer | null;
  theme: StickerTheme;
  url: string;
  maxEdge?: number;
}): Promise<RenderedSticker> {
  const base = art
    ? await sharp(art)
        .rotate()
        .resize(maxEdge, maxEdge, { fit: "inside", withoutEnlargement: true })
        .flatten({ background: "#FFFFFF" })
        .png()
        .toBuffer({ resolveWithObject: true })
    : await sharp(Buffer.from(defaultArtworkSvg(theme, maxEdge)))
        .png()
        .toBuffer({ resolveWithObject: true });

  const { width, height } = base.info;
  const box = qrBox(width, height, theme.qrBoxSize);
  const qr = await sharp(Buffer.from(qrSquareSvg(url, box.size))).png().toBuffer();

  const png = await sharp(base.data)
    .composite([{ input: qr, left: box.left, top: box.top }])
    .png()
    .toBuffer();

  return { png, width, height };
}

/**
 * One PDF page per sticker, each at its real printed size: as wide as the
 * sticker's own `widthMm` (or the default given here), and as tall as the
 * artwork's proportions make it. An order can mix products of different sizes.
 */
export async function stickerPdf(
  stickers: (RenderedSticker & { widthMm?: number })[],
  widthMm: number,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle("Jogajog Emergency stickers");
  doc.setCreator("Jogajog Emergency");

  for (const sticker of stickers) {
    const image = await doc.embedPng(sticker.png);
    const width = mmToPt(sticker.widthMm ?? widthMm);
    const height = (width * sticker.height) / sticker.width;
    const page = doc.addPage([width, height]);
    page.drawImage(image, { x: 0, y: 0, width, height });
  }

  return doc.save();
}
