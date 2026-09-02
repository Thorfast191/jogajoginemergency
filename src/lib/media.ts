import { createHash } from "node:crypto";
import sharp, { type Sharp, type Metadata } from "sharp";

export type MediaKind = "PROFILE_PHOTO" | "PRODUCT_IMAGE";

export type ProcessedImage = {
  data: Buffer;
  mimeType: "image/webp";
  width: number;
  height: number;
  byteSize: number;
  checksum: string;
};

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp"]);
const MAX_EDGE: Record<MediaKind, number> = { PROFILE_PHOTO: 512, PRODUCT_IMAGE: 1024 };

/** Thrown for a rejected upload; message is safe to show a user. */
export class MediaError extends Error {}

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

async function encode(pipeline: Sharp, edge: number): Promise<ProcessedImage> {
  const out = await pipeline
    .rotate() // honour EXIF orientation before metadata is stripped
    .resize(edge, edge, { fit: "inside", withoutEnlargement: true })
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

/**
 * Validate and normalise an uploaded image to a stripped WebP sized for its
 * use. Rejects oversize input and anything sharp cannot decode as a raster
 * image.
 */
export async function processImage(input: Buffer, kind: MediaKind): Promise<ProcessedImage> {
  if (input.byteLength > MAX_UPLOAD_BYTES) {
    throw new MediaError("Image is larger than 5 MB.");
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
  return encode(sharp(input), MAX_EDGE[kind]);
}

/** Rasterise an inline SVG string to a square WebP — used for seed placeholders. */
export async function renderSvgToWebp(svg: string, size: number): Promise<ProcessedImage> {
  // High density so the vector rasterises larger than `size`, then `encode`
  // downscales it crisply (its withoutEnlargement guard would otherwise pin
  // the output to the SVG's nominal 72dpi pixel size).
  return encode(sharp(Buffer.from(svg), { density: 300 }).resize(size, size), size);
}
