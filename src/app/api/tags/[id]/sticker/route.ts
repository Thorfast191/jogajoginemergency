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
// fetch it, and nothing may cache it. Refusals are 404s.
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

  const sticker = await renderTagSticker(tag, { thumb });
  const body = pdf ? await stickerPdf([sticker], tag.widthMm) : new Uint8Array(sticker.png);

  const headers = new Headers({
    "Content-Type": pdf ? "application/pdf" : "image/png",
    "Cache-Control": "private, no-store",
  });
  if (download) {
    headers.set(
      "Content-Disposition",
      `attachment; filename="jogajog-sticker-${tag.shortCode}.${pdf ? "pdf" : "png"}"`,
    );
  }
  return new NextResponse(body as BodyInit, { headers });
}

function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
