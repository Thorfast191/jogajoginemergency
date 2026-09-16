import { createHash } from "node:crypto";
import sharp, { type Sharp, type Metadata } from "sharp";
import { MAX_IMAGE_BYTES, MAX_THEME_ART_BYTES } from "@/lib/upload-limits";

export type MediaKind = "PROFILE_PHOTO" | "PRODUCT_IMAGE";

export type ProcessedImage = {
  data: Buffer;
  mimeType: "image/webp" | "image/png";
  width: number;
  height: number;
  byteSize: number;
  checksum: string;
};

const MAX_UPLOAD_BYTES = MAX_IMAGE_BYTES;
const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp"]);
const MAX_EDGE: Record<MediaKind, number> = { PROFILE_PHOTO: 512, PRODUCT_IMAGE: 1024 };

// Theme artwork is printed, not just shown on a screen, and a customer's QR is
// composited into it. It is kept large and lossless so a 60–100 mm sticker
// prints sharp; everything else is sized for the web.
export { MAX_THEME_ART_BYTES };
const THEME_ART_EDGE = 3000;

/** Thrown for a rejected upload; message is safe to show a user. */
export class MediaError extends Error {}

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

async function encode(
  pipeline: Sharp,
  edge: number,
  { allowEnlarge = false }: { allowEnlarge?: boolean } = {},
): Promise<ProcessedImage> {
  const out = await pipeline
    .rotate() // honour EXIF orientation before metadata is stripped
    .resize(edge, edge, { fit: "inside", withoutEnlargement: !allowEnlarge })
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });
  return {
    data: out.data,
    mimeType: "image/webp",
    width: out.info.width,
    height: out.info.height,
    byteSize: out.data.byteLength,
    checksum: sha256(out.data),
  };
}

/** Reject oversize input and anything sharp cannot decode as an accepted raster. */
async function validate(input: Buffer, maxBytes: number): Promise<void> {
  if (input.byteLength > maxBytes) {
    throw new MediaError(`Image is larger than ${Math.round(maxBytes / (1024 * 1024))} MB.`);
  }
  let meta: Metadata;
  try {
    meta = await sharp(input).metadata();
  } catch {
    throw new MediaError("That file isn't a readable image.");
  }
  if (!meta.format || !ACCEPTED_FORMATS.has(meta.format)) {
    throw new MediaError("Use a JPEG, PNG, or WebP image.");
  }
}

/**
 * Validate and normalise an uploaded image to a stripped WebP sized for its
 * use. Rejects oversize input and anything sharp cannot decode as a raster
 * image.
 */
export async function processImage(input: Buffer, kind: MediaKind): Promise<ProcessedImage> {
  await validate(input, MAX_UPLOAD_BYTES);
  return encode(sharp(input), MAX_EDGE[kind]);
}

/**
 * Validate and store sticker artwork at print quality: longest edge up to
 * 3000px, lossless PNG, metadata stripped. Re-encoded like every other upload,
 * so nothing is stored as it arrived.
 */
export async function processThemeArt(input: Buffer): Promise<ProcessedImage> {
  await validate(input, MAX_THEME_ART_BYTES);
  const out = await sharp(input)
    .rotate()
    .resize(THEME_ART_EDGE, THEME_ART_EDGE, { fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toBuffer({ resolveWithObject: true });
  return {
    data: out.data,
    mimeType: "image/png",
    width: out.info.width,
    height: out.info.height,
    byteSize: out.data.byteLength,
    checksum: sha256(out.data),
  };
}

/** Rasterise an inline SVG string to a square WebP — used for seed placeholders. */
export async function renderSvgToWebp(svg: string, size: number): Promise<ProcessedImage> {
  // High density so the vector rasterises larger than `size`, then `encode`
  // downscales it crisply (its withoutEnlargement guard would otherwise pin
  // the output to the SVG's nominal 72dpi pixel size).
  return encode(sharp(Buffer.from(svg), { density: 300 }), size, { allowEnlarge: true });
}
