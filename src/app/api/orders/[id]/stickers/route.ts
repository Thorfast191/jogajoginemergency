import { NextResponse } from "next/server";
import { getStaffWith } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { loadTagSticker, renderTagSticker, type TagSticker } from "@/lib/sticker-server";
import { stickerPdf } from "@/lib/sticker";

// The print file for an order: one real-size page per sticker, ready for the
// printer. Deactivated tags are left out — a taken-down code must not be
// printed and shipped.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getStaffWith("orders.manage"))) return notFound();
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      orderNumber: true,
      items: {
        orderBy: { id: "asc" },
        select: {
          tags: {
            where: { status: { not: "DEACTIVATED" } },
            orderBy: { createdAt: "asc" },
            select: { id: true },
          },
        },
      },
    },
  });
  if (!order) return notFound();

  const tagIds = order.items.flatMap((i) => i.tags.map((t) => t.id));
  if (tagIds.length === 0) return notFound();

  const loaded = (await Promise.all(tagIds.map(loadTagSticker))).filter(
    (t): t is TagSticker => t !== null,
  );
  // Sequential: each print render holds a few megabytes of pixels, and an
  // order is a handful of stickers — memory matters more than a second saved.
  const stickers = [];
  for (const tag of loaded) stickers.push(await renderTagSticker(tag));

  const pdf = await stickerPdf(stickers, 60);
  return new NextResponse(pdf as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="jogajog-order-${order.orderNumber}-stickers.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}

function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
