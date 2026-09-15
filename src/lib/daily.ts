// Day-by-day counts for the console's activity charts.
//
// The database only returns days that had something in them; a chart needs
// every day in the window, so the gaps are filled with zeros here. UTC days,
// matching how timestamps are stored.

export type DayCount = { day: string; count: number };

const DAY_MS = 24 * 60 * 60 * 1000;

/** YYYY-MM-DD for a date, in UTC. */
export function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Exactly `days` entries, oldest first, ending with today's UTC day. */
export function fillDays(
  rows: readonly { day: string; count: number }[],
  days: number,
  now: Date,
): DayCount[] {
  const counts = new Map(rows.map((r) => [r.day, r.count]));
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  const out: DayCount[] = [];
  for (let back = days - 1; back >= 0; back--) {
    const day = utcDay(new Date(today - back * DAY_MS));
    out.push({ day, count: counts.get(day) ?? 0 });
  }
  return out;
}
