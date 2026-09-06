import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { notifySubscriptionExpiring } from "@/lib/notify";
import { pruneRateLimits } from "@/lib/rate-limit";

// Periodic housekeeping, meant to be called by cron or a systemd timer:
//
//   curl -H "Authorization: Bearer $MAINTENANCE_SECRET" https://…/api/maintenance
//
// There is no scheduler in the app itself, so without this a subscription
// simply goes quiet and nobody is told. Everything here is idempotent — running
// it twice in a day sends nothing twice.

const DAY_MS = 24 * 60 * 60 * 1000;

// Warn at a week and at a day, then once more when it has actually lapsed.
const WARN_DAYS = [7, 1, 0];

function authorized(req: Request): boolean {
  const secret = process.env.MAINTENANCE_SECRET;
  if (!secret) return false;

  const header = req.headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7) : "";

  const a = Buffer.from(presented);
  const b = Buffer.from(secret);
  // Compare in constant time, and only when the lengths already match —
  // timingSafeEqual throws on a length mismatch.
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  return run(req);
}

export async function GET(req: Request) {
  return run(req);
}

async function run(req: Request): Promise<Response> {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const now = Date.now();
  let notified = 0;

  for (const days of WARN_DAYS) {
    // Everything whose period ends inside this day-wide slice.
    const from = new Date(now + days * DAY_MS - DAY_MS / 2);
    const to = new Date(now + days * DAY_MS + DAY_MS / 2);

    const due = await prisma.subscription.findMany({
      where: {
        status: { in: ["ACTIVE", "TRIALING"] },
        currentPeriodEnd: { gte: from, lt: to },
      },
      select: { userId: true, user: { select: { email: true } } },
    });

    for (const sub of due) {
      // One warning per user per day, whatever else ran.
      const already = await prisma.notificationLog.findFirst({
        where: {
          userId: sub.userId,
          kind: "SUBSCRIPTION_EXPIRING",
          createdAt: { gte: new Date(now - DAY_MS) },
        },
        select: { id: true },
      });
      if (already) continue;

      await notifySubscriptionExpiring({
        userId: sub.userId,
        email: sub.user.email,
        daysLeft: days,
      });
      notified++;
    }
  }

  const prunedCounters = await pruneRateLimits();

  // Notification rows are an audit trail, not an archive; successful ones are
  // dropped after 90 days, failures kept so they stay visible.
  const { count: prunedNotifications } = await prisma.notificationLog.deleteMany({
    where: { status: "SENT", createdAt: { lt: new Date(now - 90 * DAY_MS) } },
  });

  return NextResponse.json({ ok: true, notified, prunedCounters, prunedNotifications });
}
