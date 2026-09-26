import Link from "next/link";
import { getStaffWith } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { roleLabel } from "@/lib/permissions";
import { pageParams } from "@/lib/pagination";
import { Forbidden } from "@/components/admin/forbidden";
import { Pagination } from "@/components/admin/pagination";

export const dynamic = "force-dynamic";

// Every group must have a home for every action that is written, or a row is
// only ever visible under "Everything" — which is where an untracked-looking
// change hides in plain sight.
const GROUPS = [
  { id: "money", label: "Money", prefixes: ["order.", "subscription."] },
  { id: "pricing", label: "Pricing", prefixes: ["product.", "plan."] },
  // Spans tags, accounts and themes: takedowns, suspensions and archives.
  { id: "codes", label: "Codes & accounts", prefixes: ["tag.", "user.", "theme."] },
  // Changes to a customer's own record, and decisions about reports on them.
  { id: "customers", label: "Customers", prefixes: ["customer.", "abuse-report."] },
  { id: "admins", label: "Admins", prefixes: ["admin."] },
  { id: "platform", label: "Platform", prefixes: ["settings.", "maintenance."] },
] as const;

function targetHref(type: string, id: string): string | null {
  switch (type) {
    case "user":
      return `/admin/users/${id}`;
    case "tag":
      return `/admin/tags/${id}`;
    case "order":
      return `/admin/orders/${id}`;
    case "product":
      return `/admin/products/${id}`;
    case "theme":
      return `/admin/themes/${id}`;
    case "subscription":
      return `/admin/subscriptions/${id}`;
    case "plan":
      return "/admin/plans";
    case "settings":
      return "/admin/settings";
    default:
      return null;
  }
}

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; page?: string }>;
}) {
  if (!(await getStaffWith("settings.manage"))) return <Forbidden />;

  const sp = await searchParams;
  const group = GROUPS.find((g) => g.id === sp.group);
  const { page, skip, take } = pageParams(sp.page);
  const where = group ? { OR: group.prefixes.map((p) => ({ action: { startsWith: p } })) } : {};

  const [rows, total] = await Promise.all([
    prisma.adminAuditLog.findMany({
      where,
      include: { actor: { select: { name: true, email: true, role: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.adminAuditLog.count({ where }),
  ]);

  const tab = (active: boolean) =>
    `rounded-lg border px-3 py-1.5 ${
      active
        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary-dark)]"
        : "border-black/15 bg-white hover:bg-black/5"
    }`;

  return (
    <div>
      <h1 className="text-2xl font-bold">Activity log</h1>
      <p className="mt-1 text-sm text-black/60">
        Every money, pricing, customer, takedown and admin change made in the console, newest
        first.
      </p>

      <div className="mt-5 flex flex-wrap gap-2 text-sm">
        <Link href="/admin/activity" className={tab(!group)}>
          Everything
        </Link>
        {GROUPS.map((g) => (
          <Link key={g.id} href={`/admin/activity?group=${g.id}`} className={tab(group?.id === g.id)}>
            {g.label}
          </Link>
        ))}
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-black/10 bg-white">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-black/50 border-b border-black/10">
              <th className="py-3 px-4">When</th>
              <th className="py-3 px-4">Who</th>
              <th className="py-3 px-4">What</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const href = targetHref(r.targetType, r.targetId);
              return (
                <tr key={r.id} className="border-b border-black/5 last:border-b-0 align-top">
                  <td className="py-3 px-4 whitespace-nowrap text-black/60">{r.createdAt.toLocaleString()}</td>
                  <td className="py-3 px-4">
                    {r.actor ? (
                      <>
                        {r.actor.name}
                        <div className="text-xs text-black/40">{roleLabel(r.actor.role)}</div>
                      </>
                    ) : (
                      <span className="text-black/40">Deleted account</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {r.summary}
                    <div className="font-mono text-[11px] text-black/35">{r.action}</div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {href && (
                      <Link href={href} className="text-xs font-medium text-[var(--color-primary-dark)] hover:underline">
                        Open
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="py-10 px-4 text-center text-sm text-black/50">
                  Nothing recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination basePath="/admin/activity" params={{ group: group?.id }} page={page} total={total} />
    </div>
  );
}
