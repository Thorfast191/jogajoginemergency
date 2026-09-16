import Link from "next/link";
import type { AbuseReportStatus } from "@prisma/client";
import { getStaffWith } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { pageParams } from "@/lib/pagination";
import { Forbidden } from "@/components/admin/forbidden";
import { Pagination } from "@/components/admin/pagination";
import { ReportStatusSelect } from "./report-status-select";

export const dynamic = "force-dynamic";

const STATUSES = ["OPEN", "REVIEWING", "RESOLVED", "DISMISSED"] as const satisfies readonly AbuseReportStatus[];

export default async function AdminAbuseReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  if (!(await getStaffWith("console.view"))) return <Forbidden />;

  const sp = await searchParams;
  const status = STATUSES.find((s) => s === sp.status);
  const { page, skip, take } = pageParams(sp.page);
  const where = status ? { status } : {};

  // Paged rather than capped: reports are anonymous and keep arriving, and an
  // open one that fell past a fixed cut-off would never be seen again.
  const [reports, total, byStatus] = await Promise.all([
    prisma.abuseReport.findMany({
      where,
      include: { tag: { select: { id: true, shortCode: true, status: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.abuseReport.count({ where }),
    prisma.abuseReport.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const count = (s: string) => byStatus.find((g) => g.status === s)?._count._all ?? 0;

  const chip = (active: boolean) =>
    `rounded-lg border px-3 py-1.5 ${
      active
        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary-dark)]"
        : "border-black/15 bg-white hover:bg-black/5"
    }`;

  return (
    <div>
      <h1 className="text-2xl font-bold">Abuse Reports</h1>

      <div className="mt-5 flex flex-wrap gap-2 text-sm">
        <Link href="/admin/abuse-reports" className={chip(!status)}>
          All ({byStatus.reduce((n, g) => n + g._count._all, 0)})
        </Link>
        {STATUSES.map((s) => (
          <Link key={s} href={`/admin/abuse-reports?status=${s}`} className={chip(status === s)}>
            {s} ({count(s)})
          </Link>
        ))}
      </div>

      <ul className="mt-6 space-y-3">
        {reports.map((r) => (
          <li
            key={r.id}
            className="rounded-lg border border-black/10 bg-white p-4 flex items-center justify-between gap-4"
          >
            <div className="min-w-0">
              <p className="font-medium">{r.reason}</p>
              <p className="text-xs text-black/50">
                {r.tag ? (
                  // The report is only useful if it leads to the code, where a
                  // takedown happens.
                  <Link href={`/admin/tags/${r.tag.id}`} className="text-emerald-700 hover:underline">
                    Tag {r.tag.shortCode} ({r.tag.status.toLowerCase()})
                  </Link>
                ) : (
                  "No tag"
                )}{" "}
                · {r.createdAt.toLocaleString()}
              </p>
              {r.details && <p className="mt-1 text-sm text-black/70">{r.details}</p>}
            </div>
            <ReportStatusSelect reportId={r.id} status={r.status} />
          </li>
        ))}
        {reports.length === 0 && <p className="text-sm text-black/50">No reports.</p>}
      </ul>

      <Pagination basePath="/admin/abuse-reports" params={{ status }} page={page} total={total} />
    </div>
  );
}
