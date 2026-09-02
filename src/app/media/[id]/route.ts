import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Image bytes for MediaAsset rows (profile photos, product images). Ids are
// unguessable cuids; the scan page decides whether to render an <img> at all,
// so this route just serves whatever id it's given, cached hard.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const asset = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const etag = `"${asset.checksum}"`;
  if (req.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } });
  }

  return new NextResponse(new Uint8Array(asset.data), {
    headers: {
      "Content-Type": asset.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: etag,
    },
  });
}
