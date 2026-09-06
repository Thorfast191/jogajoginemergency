import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/session";
import { resolveMediaAccess, type Viewer } from "@/lib/media-access";

// Image bytes for MediaAsset rows (profile photos, product images).
//
// Ids are NOT a secret — `cuid()` is mostly timestamp, counter and machine
// fingerprint — so every request is authorized on its own merits. A profile
// photo is served publicly only while a profile actually points at it with
// `photoPublic` set; the moment the owner turns that off this route stops
// serving it, and the `private` cache directive keeps a CDN from defeating
// that with a copy of its own.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Metadata only — the blob is fetched after authorization, and never at all
  // on the 304 path.
  const asset = await prisma.mediaAsset.findUnique({
    where: { id },
    select: {
      kind: true,
      ownerId: true,
      mimeType: true,
      checksum: true,
      profileUsages: { select: { photoPublic: true } },
    },
  });
  if (!asset) return notFound();

  const publiclyVisible = asset.profileUsages.some((p) => p.photoPublic);

  // Only a private photo needs to know who is asking; skipping the session
  // read otherwise keeps the common path cheap.
  let viewer: Viewer = null;
  if (asset.kind === "PROFILE_PHOTO" && !publiclyVisible) {
    const user = await requireActiveUser();
    if (user) viewer = { id: user.id, role: user.role as "USER" | "ADMIN" };
  }

  const access = resolveMediaAccess(
    { kind: asset.kind, ownerId: asset.ownerId },
    { publiclyVisible, viewer },
  );
  // 404 rather than 403: a refusal shouldn't confirm the asset exists.
  if (!access.allowed) return notFound();

  const headers = new Headers({
    "Content-Type": asset.mimeType,
    "Cache-Control": access.cacheControl,
    ETag: `"${asset.checksum}"`,
  });
  if (access.varyOnCookie) headers.set("Vary", "Cookie");

  if (req.headers.get("if-none-match") === `"${asset.checksum}"`) {
    return new NextResponse(null, { status: 304, headers });
  }

  const blob = await prisma.mediaAsset.findUnique({ where: { id }, select: { data: true } });
  if (!blob) return notFound();

  return new NextResponse(new Uint8Array(blob.data), { headers });
}

function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
