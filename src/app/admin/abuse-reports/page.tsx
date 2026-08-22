import { prisma } from "@/lib/prisma";
import { ReportStatusSelect } from "./report-status-select";

export default async function AdminAbuseReportsPage() {
  const reports = await prisma.abuseReport.findMany({
    include: { tag: { select: { shortCode: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Abuse reports</h1>
      <ul className="mt-6 space-y-3">
        {reports.map((r) => (
          <li key={r.id} className="rounded-lg border border-black/10 p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{r.reason}</p>
              <p className="text-xs text-black/50">
                {r.tag ? `Tag ${r.tag.shortCode}` : "No tag"} · {r.createdAt.toLocaleString()}
              </p>
              {r.details && <p className="mt-1 text-sm text-black/70">{r.details}</p>}
            </div>
            <ReportStatusSelect reportId={r.id} status={r.status} />
          </li>
        ))}
        {reports.length === 0 && <p className="text-sm text-black/50">No reports.</p>}
      </ul>
    </div>
  );
}
