import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { relayMessageSchema } from "@/lib/validations";
import { getClientIp } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";
import { notifyOwnerOfRelayMessage } from "@/lib/notify";

export async function POST(req: Request, { params }: { params: Promise<{ shortCode: string }> }) {
  const { shortCode } = await params;
  const ip = await getClientIp();

  const { allowed } = await rateLimit(`relay:${ip}`, { limit: 5, windowMs: 5 * 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many messages sent. Try again later." }, { status: 429 });
  }

  const tagLimit = await rateLimit(`relay-tag:${shortCode}`, { limit: 10, windowMs: 5 * 60_000 });
  if (!tagLimit.allowed) {
    return NextResponse.json({ error: "Too many messages sent for this tag. Try again later." }, { status: 429 });
  }

  const tag = await prisma.tag.findUnique({
    where: { shortCode },
    include: {
      user: { select: { id: true, email: true } },
      product: { select: { name: true } },
    },
  });
  if (!tag || !tag.user || tag.status === "DEACTIVATED") {
    return NextResponse.json({ error: "Tag not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = relayMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  await prisma.relayMessage.create({
    data: {
      tagId: tag.id,
      finderContact: parsed.data.finderContact,
      message: parsed.data.message,
    },
  });

  // The message is already saved, so a mail failure must not fail the request:
  // the finder did their part and should be thanked either way.
  await notifyOwnerOfRelayMessage({
    userId: tag.user.id,
    ownerEmail: tag.user.email,
    tagLabel: tag.internalLabel ?? tag.product?.name ?? `/t/${shortCode}`,
    finderContact: parsed.data.finderContact,
    message: parsed.data.message,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
