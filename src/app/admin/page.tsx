import { prisma } from "@/lib/prisma";

export default async function AdminOverviewPage() {
  const [userCount, tagCount, activeSubs, openReports, scanCount] = await Promise.all([
    prisma.user.count({ where: { role: "USER" } }),
    prisma.tag.count(),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.abuseReport.count({ where: { status: "OPEN" } }),
    prisma.scanEvent.count(),
  ]);

  const stats = [
    { label: "Subscribers", value: userCount },
    { label: "Tags issued", value: tagCount },
    { label: "Active subscriptions", value: activeSubs },
    { label: "Total scans", value: scanCount },
    { label: "Open abuse reports", value: openReports },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Admin overview</h1>
      <div className="mt-6 grid sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-black/10 p-4">
            <p className="text-sm text-black/60">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
