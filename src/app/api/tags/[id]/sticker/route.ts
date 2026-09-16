import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { loadTagSticker, renderTagSticker } from "@/lib/sticker-server";
import { stickerPdf } from "@/lib/sticker";

// The finished sticker for one tag: theme artwork with the tag's QR in the
// centre square.
//
//   ?format=png (default) | pdf   — PDF is one page at the product's real width
//   ?size=thumb                   — small PNG for lists and previews
//   ?download=1                   — send as an attachment
//
// The image carries the tag's short code, which is all a stranger needs to
// open the emergency page, so only the owner and staff who manage QR codes may
// fetch it, and no shared cache may keep it. Refusals are 404s.
//
// A sticker is a pure function of (theme artwork, square size, short code), so
// it carries an ETag and revalidates: a list of fifty thumbnails re-renders
// nothing on a second visit, while a deleted tag still 404s on the next
// request because every use revalidates.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireActiveUser();
  if (!user) return notFound();

  const tag = await loadTagSticker(id);
  if (!tag || (tag.userId !== user.id && !can(user.role, "tags.manage"))) return notFound();

  const query = new URL(req.url).searchParams;
  const pdf = query.get("format") === "pdf";
  const thumb = !pdf && query.get("size") === "thumb";
  const download = pdf || query.get("download") === "1";

  const variant = pdf ? `pdf-${tag.widthMm}` : thumb ? "thumb" : "png";
  const etag = `"tag-${tag.shortCode}-${tag.themeVersion}-${tag.theme.qrBoxSize}-${variant}"`;
  const headers = new Headers({
    "Content-Type": pdf ? "application/pdf" : "image/png",
    ETag: etag,
    "Cache-Control": "private, max-age=0, must-revalidate",
  });
  if (download) {
    headers.set(
      "Content-Disposition",
      `attachment; filename="jogajog-sticker-${tag.shortCode}.${pdf ? "pdf" : "png"}"`,
    );
  }

  if (req.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers });
  }

  const sticker = await renderTagSticker(tag, { thumb });
  const body = pdf ? await stickerPdf([sticker], tag.widthMm) : new Uint8Array(sticker.png);
  return new NextResponse(body as BodyInit, { headers });
}

function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
