import { NextResponse } from "next/server";
import { getStaffWith } from "@/lib/session";
import { renderThemePreview } from "@/lib/sticker-server";

// A theme's sticker with a sample QR in its square, for the shop, the theme
// gallery and the admin editor. The sample QR opens the demo scan page, so
// this reveals nothing about anyone.
//
// Live themes are public and briefly cacheable. A draft or archived theme is
// only previewed to staff who edit the catalogue.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const preview = await renderThemePreview(id);
  if (!preview) return notFound();

  const live = preview.status === "ACTIVE";
  if (!live && !(await getStaffWith("catalog.edit"))) return notFound();

  return new NextResponse(new Uint8Array(preview.png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": live ? "public, max-age=300, stale-while-revalidate=3600" : "private, no-store",
      "Last-Modified": preview.updatedAt.toUTCString(),
    },
  });
}

function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
