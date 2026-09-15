import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { generateTagQrPngBuffer } from "@/lib/qr";

// The bare QR, for customers who print on their own sticker stock. The owner
// may download it, and so may staff who manage QR codes (support cases).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireActiveUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tag = await prisma.tag.findUnique({ where: { id }, select: { shortCode: true, userId: true } });
  if (!tag || (tag.userId !== user.id && !can(user.role, "tags.manage"))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const png = await generateTagQrPngBuffer(tag.shortCode);

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="jogajog-tag-${tag.shortCode}.png"`,
      "Cache-Control": "private, no-store",
    },
  });
}
