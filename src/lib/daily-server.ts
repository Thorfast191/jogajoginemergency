import { prisma } from "@/lib/prisma";
import { fillDays, type DayCount } from "@/lib/daily";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Scans per UTC day for the last `days` days, zero-filled.
 *
 * Grouped in the database rather than by fetching every scan: a busy month is
 * many thousands of rows, and the chart only needs thirty numbers. Timestamps
 * are stored as UTC without a zone, so truncating them gives the UTC day.
 */
export async function dailyScanCounts(days: number, now: Date = new Date()): Promise<DayCount[]> {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const since = new Date(today - (days - 1) * DAY_MS);

  const rows = await prisma.$queryRaw<{ day: string; count: number }[]>`
    SELECT to_char(date_trunc('day', "scannedAt"), 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
    FROM "ScanEvent"
    WHERE "scannedAt" >= ${since}
    GROUP BY 1
  `;
  return fillDays(rows, days, now);
}
