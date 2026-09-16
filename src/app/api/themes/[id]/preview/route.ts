import { NextResponse } from "next/server";
import { getStaffWith } from "@/lib/session";
import { loadThemePreview, renderThemePreview } from "@/lib/sticker-server";

// A theme's sticker with a sample QR in its square, for the shop, the theme
// gallery and the admin editor. The sample QR opens the demo scan page, so
// this reveals nothing about anyone.
//
// The theme is looked up first and rendered last: rendering decodes artwork of
// up to 3000px and composites a QR, and an unauthenticated caller must not be
// able to make the server do that before we know they may even see the theme.
// The ETag is the theme's own updatedAt, so a browser that already has the
// image revalidates into a 304 instead of a fresh render.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const theme = await loadThemePreview(id);
  if (!theme) return notFound();

  const live = theme.status === "ACTIVE";
  if (!live && !(await getStaffWith("catalog.edit"))) return notFound();

  const etag = `"theme-${theme.id}-${theme.updatedAt.getTime()}-${theme.qrBoxSize}"`;
  const headers = new Headers({
    "Content-Type": "image/png",
    ETag: etag,
    "Last-Modified": theme.updatedAt.toUTCString(),
    "Cache-Control": live
      ? "public, max-age=300, stale-while-revalidate=3600"
      : "private, max-age=0, must-revalidate",
  });

  if (req.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers });
  }

  const preview = await renderThemePreview(theme);
  return new NextResponse(new Uint8Array(preview.png), { headers });
}

function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
