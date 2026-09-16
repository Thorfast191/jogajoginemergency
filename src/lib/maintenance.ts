import { prisma } from "@/lib/prisma";
import { notifySubscriptionExpiring } from "@/lib/notify";
import { pruneRateLimits } from "@/lib/rate-limit";

// Periodic housekeeping, shared by /api/maintenance (for cron) and the Run now
// button in platform settings. There is no scheduler in the app itself, so
// without this a subscription simply goes quiet and nobody is told. Everything
// here is idempotent — running it twice in a day sends nothing twice.

const DAY_MS = 24 * 60 * 60 * 1000;

// Warn at a week and at a day, then once more when it has actually lapsed.
const WARN_DAYS = [7, 1, 0];

export type MaintenanceResult = {
  notified: number;
  prunedCounters: number;
  prunedNotifications: number;
};

export async function runMaintenance(now: number = Date.now()): Promise<MaintenanceResult> {
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

    if (due.length === 0) continue;

    // One warning per user per day, whatever else ran. Asked once for the whole
    // slice: a per-subscription lookup is a round trip each, and this also runs
    // synchronously behind the "Run maintenance now" button.
    const warnedRows = await prisma.notificationLog.findMany({
      where: {
        userId: { in: due.map((s) => s.userId) },
        kind: "SUBSCRIPTION_EXPIRING",
        createdAt: { gte: new Date(now - DAY_MS) },
      },
      select: { userId: true },
    });
    const warned = new Set(warnedRows.map((r) => r.userId));

    for (const sub of due) {
      if (warned.has(sub.userId)) continue;
      warned.add(sub.userId);

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

  return { notified, prunedCounters, prunedNotifications };
}
