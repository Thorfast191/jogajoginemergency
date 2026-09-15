import type { DayCount } from "@/lib/daily";

/** A clean axis top: 4, 5, 10, 20, 50… at or above the largest value. */
function niceMax(value: number): number {
  if (value <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(value));
  const n = value / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

function dayLabel(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/**
 * Daily counts as columns — one series, so no legend: the card title names it.
 *
 * Built from plain elements rather than SVG so it needs no client JavaScript.
 * Each day's whole column is the hover and focus target (much bigger than the
 * bar), and shows a value-first tooltip. Bars are capped at 24px with a 4px
 * rounded top and a square base; gridlines are solid hairlines. Every value is
 * also in the table under the chart, so the tooltip never gates anything.
 */
export function BarChart({
  data,
  unit,
  height = 160,
}: {
  data: DayCount[];
  /** Singular noun for the tooltip, e.g. "scan". */
  unit: string;
  height?: number;
}) {
  const max = niceMax(Math.max(0, ...data.map((d) => d.count)));
  const ticks = max % 2 === 0 ? [max, max / 2, 0] : [max, 0];
  const plural = (n: number) => `${n.toLocaleString()} ${unit}${n === 1 ? "" : "s"}`;
  const labelled = new Set([0, Math.floor((data.length - 1) / 2), data.length - 1]);

  return (
    <figure>
      <div className="flex gap-2" style={{ height }}>
        <div className="relative w-8 shrink-0 text-right text-[11px] tabular-nums text-black/40" aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${100 - (t / max) * 100}%` }}>
              {t.toLocaleString()}
            </span>
          ))}
        </div>

        <div className="relative flex-1">
          {ticks.map((t) => (
            <div
              key={t}
              aria-hidden
              className="absolute inset-x-0 border-t border-black/[0.07]"
              style={{ top: `${100 - (t / max) * 100}%` }}
            />
          ))}

          <div className="absolute inset-0 flex items-end gap-[2px]">
            {data.map((d, i) => {
              const align = i < 3 ? "left-0" : i > data.length - 4 ? "right-0" : "left-1/2 -translate-x-1/2";
              return (
                <div
                  key={d.day}
                  tabIndex={0}
                  aria-label={`${dayLabel(d.day)}: ${plural(d.count)}`}
                  className="group relative flex h-full min-w-0 flex-1 items-end justify-center rounded-sm outline-none focus-visible:bg-black/[0.04]"
                >
                  <div
                    className="w-[72%] max-w-6 rounded-t-[4px] bg-[var(--color-primary)] transition-[filter] group-hover:brightness-110 group-focus-visible:brightness-110"
                    style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? 3 : 0 }}
                  />
                  <div
                    role="tooltip"
                    className={`pointer-events-none absolute bottom-full z-10 mb-2 hidden whitespace-nowrap rounded-lg bg-[#1c1917] px-2.5 py-1.5 text-xs text-white shadow-lg group-hover:block group-focus-visible:block ${align}`}
                  >
                    <span className="font-semibold">{plural(d.count)}</span>
                    <span className="text-white/60"> · {dayLabel(d.day)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="ml-10 mt-1.5 flex text-[11px] text-black/40" aria-hidden>
        {data.map((d, i) => (
          <span key={d.day} className="min-w-0 flex-1 overflow-visible whitespace-nowrap text-center">
            {labelled.has(i) ? dayLabel(d.day) : ""}
          </span>
        ))}
      </div>

      <details className="mt-3 text-xs">
        <summary className="cursor-pointer text-black/50 hover:text-black">Show as table</summary>
        <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-black/10">
          <table className="w-full">
            <thead className="sticky top-0 bg-white text-left text-black/50">
              <tr>
                <th className="px-3 py-1.5 font-medium">Day</th>
                <th className="px-3 py-1.5 text-right font-medium capitalize">{unit}s</th>
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((d) => (
                <tr key={d.day} className="border-t border-black/5">
                  <td className="px-3 py-1">{dayLabel(d.day)}</td>
                  <td className="px-3 py-1 text-right tabular-nums">{d.count.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
