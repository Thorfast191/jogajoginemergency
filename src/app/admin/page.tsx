import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  if (!(await getAdmin())) redirect("/dashboard");

  const [customers, suspended, unassignedTags, issuedTags, activeSubs, openReports, scanCount] =
    await Promise.all([
      prisma.user.count({ where: { role: "USER" } }),
      prisma.user.count({ where: { role: "USER", status: "SUSPENDED" } }),
      prisma.tag.count({ where: { status: "UNASSIGNED", userId: null } }),
      prisma.tag.count({ where: { userId: { not: null } } }),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.abuseReport.count({ where: { status: "OPEN" } }),
      prisma.scanEvent.count(),
    ]);

  const groups: { title: string; stats: { label: string; value: number; href?: string }[] }[] = [
    {
      title: "Customers",
      stats: [
        { label: "Customer accounts", value: customers, href: "/admin/users" },
        { label: "Suspended", value: suspended, href: "/admin/users" },
        { label: "Active subscriptions", value: activeSubs, href: "/admin/subscriptions" },
      ],
    },
    {
      title: "Tag inventory",
      stats: [
        { label: "Unassigned / available", value: unassignedTags, href: "/admin/tags" },
        { label: "Issued to customers", value: issuedTags, href: "/admin/tags/issued" },
      ],
    },
    {
      title: "Monitoring",
      stats: [
        { label: "Total scans", value: scanCount, href: "/admin/scans" },
        { label: "Open abuse reports", value: openReports, href: "/admin/abuse-reports" },
      ],
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Overview</h1>

      {groups.map((group) => (
        <section key={group.title} className="mt-6">
          <h2 className="text-xs font-medium uppercase tracking-wide text-black/40">{group.title}</h2>
          <div className="mt-2 grid sm:grid-cols-3 gap-4">
            {group.stats.map((s) => {
              const card = (
                <div className="rounded-lg border border-black/10 bg-white p-4 h-full hover:border-emerald-600">
                  <p className="text-sm text-black/60">{s.label}</p>
                  <p className="mt-1 text-2xl font-semibold">{s.value}</p>
                </div>
              );
              return s.href ? (
                <Link key={s.label} href={s.href}>
                  {card}
                </Link>
              ) : (
                <div key={s.label}>{card}</div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
