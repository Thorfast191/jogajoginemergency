import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { abuseReportSchema } from "@/lib/validations";
import { getClientIp } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = await getClientIp();
  const { allowed } = await rateLimit(`abuse-report:${ip}`, { limit: 5, windowMs: 10 * 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many reports. Try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = abuseReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  let tagId: string | undefined;
  if (parsed.data.shortCode) {
    const tag = await prisma.tag.findFirst({ where: { shortCode: parsed.data.shortCode } });
    tagId = tag?.id;
  }

  await prisma.abuseReport.create({
    data: {
      tagId,
      reason: parsed.data.reason,
      details: parsed.data.details,
    },
  });

  return NextResponse.json({ ok: true });
}
