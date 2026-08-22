import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { generateTagQrPngBuffer } from "@/lib/qr";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireActiveUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tag = await prisma.tag.findFirst({ where: { id, userId: user.id } });
  if (!tag) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const png = await generateTagQrPngBuffer(tag.shortCode);

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="jogajog-tag-${tag.shortCode}.png"`,
    },
  });
}
