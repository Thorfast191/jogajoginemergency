import Link from "next/link";
import { getStaffWith } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { summarizeUserAgent } from "@/lib/user-agent";
import { pageParams } from "@/lib/pagination";
import { dailyScanCounts } from "@/lib/daily-server";
import { Forbidden } from "@/components/admin/forbidden";
import { Pagination } from "@/components/admin/pagination";
import { BarChart } from "@/components/admin/bar-chart";

export const dynamic = "force-dynamic";

const RANGES = [
  { id: "24h", label: "Last 24 hours", hours: 24 },
  { id: "7d", label: "Last 7 days", hours: 24 * 7 },
  { id: "30d", label: "Last 30 days", hours: 24 * 30 },
] as const;

// Kept out of the component body so the render stays free of impure calls.
function now(): Date {
  return new Date();
}

export default async function AdminScansPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; page?: string }>;
}) {
  if (!(await getStaffWith("console.view"))) return <Forbidden />;

  const sp = await searchParams;
  const range = RANGES.find((r) => r.id === sp.range) ?? RANGES[1];
  const at = now();
  const since = new Date(at.getTime() - range.hours * 60 * 60 * 1000);
  const where = { scannedAt: { gte: since } };
  const { page, skip, take } = pageParams(sp.page);

  const [scans, inRange, total, daily, top] = await Promise.all([
    prisma.scanEvent.findMany({
      where,
      include: {
        tag: {
          select: {
            id: true,
            shortCode: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { scannedAt: "desc" },
      skip,
      take,
    }),
    prisma.scanEvent.count({ where }),
    prisma.scanEvent.count(),
    dailyScanCounts(30, at),
    prisma.scanEvent.groupBy({
      by: ["tagId"],
      where,
      _count: { _all: true },
      orderBy: { _count: { tagId: "desc" } },
      take: 5,
    }),
  ]);

  const topTags = await prisma.tag.findMany({
    where: { id: { in: top.map((t) => t.tagId) } },
    select: { id: true, shortCode: true, internalLabel: true, user: { select: { name: true } } },
  });
  const topRows = top
    .map((t) => ({ count: t._count._all, tag: topTags.find((x) => x.id === t.tagId) }))
    .filter((r) => r.tag);

  const chip = (active: boolean) =>
    `rounded-lg border px-3 py-1.5 ${
      active
        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary-dark)]"
        : "border-black/15 bg-white hover:bg-black/5"
    }`;

  return (
    <div>
      <h1 className="text-2xl font-bold">Scan activity</h1>
      <p className="mt-1 text-sm text-black/60">
        Public scans of customers&apos; QR codes. Scanner IPs are never stored — only a salted hash —
        so locations are coarse and best-effort.
      </p>

      <div className="mt-5 flex flex-wrap gap-2 text-sm">
        {RANGES.map((r) => (
          <Link key={r.id} href={`/admin/scans?range=${r.id}`} className={chip(range.id === r.id)}>
            {r.label}
          </Link>
        ))}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <p className="text-sm text-black/60">{range.label}</p>
          <p className="mt-1 text-2xl font-semibold">{inRange.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <p className="text-sm text-black/60">Codes scanned</p>
          <p className="mt-1 text-2xl font-semibold">{top.length === 5 ? "5+" : top.length}</p>
          <p className="mt-1 text-xs text-black/40">distinct QR codes in this range</p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <p className="text-sm text-black/60">All time</p>
          <p className="mt-1 text-2xl font-semibold">{total.toLocaleString()}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="rounded-2xl border border-black/10 bg-white p-5">
          <h2 className="font-semibold">Scans per day · last 30 days</h2>
          <div className="mt-5">
            <BarChart data={daily} unit="scan" />
          </div>
        </section>
        <section className="rounded-2xl border border-black/10 bg-white p-5">
          <h2 className="font-semibold">Most scanned · {range.label.toLowerCase()}</h2>
          {topRows.length === 0 ? (
            <p className="mt-3 text-sm text-black/50">No scans in this range.</p>
          ) : (
            <ol className="mt-3 space-y-2 text-sm">
              {topRows.map(({ count, tag }) => (
                <li key={tag!.id} className="flex items-center justify-between gap-3">
                  <Link href={`/admin/tags/${tag!.id}`} className="min-w-0 hover:underline">
                    <span className="font-mono text-xs">/t/{tag!.shortCode}</span>
                    <span className="block truncate text-xs text-black/50">
                      {tag!.internalLabel ?? "—"} · {tag!.user.name}
                    </span>
                  </Link>
                  <span className="font-semibold tabular-nums">{count}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-black/10 bg-white">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-black/50 border-b border-black/10">
              <th className="py-3 px-4">QR code</th>
              <th className="py-3 px-4">Owner</th>
              <th className="py-3 px-4">Scanned at</th>
              <th className="py-3 px-4">Approx. location</th>
              <th className="py-3 px-4">Device</th>
            </tr>
          </thead>
          <tbody>
            {scans.map((scan) => (
              <tr key={scan.id} className="border-b border-black/5 last:border-b-0 align-top">
                <td className="py-3 px-4">
                  <Link href={`/admin/tags/${scan.tag.id}`} className="font-mono text-xs hover:underline">
                    /t/{scan.tag.shortCode}
                  </Link>
                </td>
                <td className="py-3 px-4">
                  <Link href={`/admin/users/${scan.tag.user.id}`} className="hover:underline">
                    {scan.tag.user.name}
                  </Link>
                  <div className="text-xs text-black/40">{scan.tag.user.email}</div>
                </td>
                <td className="py-3 px-4 whitespace-nowrap">{scan.scannedAt.toLocaleString()}</td>
                <td className="py-3 px-4">
                  {[scan.approxCity, scan.approxRegion, scan.approxCountry].filter(Boolean).join(", ") ||
                    "Unknown"}
                </td>
                <td className="py-3 px-4">{summarizeUserAgent(scan.userAgent)}</td>
              </tr>
            ))}
            {scans.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 px-4 text-center text-sm text-black/50">
                  No scans in this range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination basePath="/admin/scans" params={{ range: range.id }} page={page} total={inRange} />
    </div>
  );
}
