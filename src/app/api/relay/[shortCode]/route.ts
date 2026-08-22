import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { relayMessageSchema } from "@/lib/validations";
import { getClientIp } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";
import { notifyOwnerOfRelayMessage } from "@/lib/notify";

export async function POST(req: Request, { params }: { params: Promise<{ shortCode: string }> }) {
  const { shortCode } = await params;
  const ip = await getClientIp();

  const { allowed } = rateLimit(`relay:${ip}`, { limit: 5, windowMs: 5 * 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many messages sent. Try again later." }, { status: 429 });
  }

  const tagLimit = rateLimit(`relay-tag:${shortCode}`, { limit: 10, windowMs: 5 * 60_000 });
  if (!tagLimit.allowed) {
    return NextResponse.json({ error: "Too many messages sent for this tag. Try again later." }, { status: 429 });
  }

  const tag = await prisma.tag.findUnique({
    where: { shortCode },
    include: { user: { select: { email: true } } },
  });
  if (!tag || tag.status === "DEACTIVATED" || tag.status === "UNASSIGNED") {
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

  await notifyOwnerOfRelayMessage({
    ownerEmail: tag.user.email,
    tagShortCode: shortCode,
    finderContact: parsed.data.finderContact,
    message: parsed.data.message,
  });

  return NextResponse.json({ ok: true });
}
