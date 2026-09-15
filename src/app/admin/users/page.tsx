import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { getStaffWith } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { can, isStaff, roleLabel } from "@/lib/permissions";
import { entitledWhere } from "@/lib/subscription";
import { pageParams } from "@/lib/pagination";
import { Forbidden } from "@/components/admin/forbidden";
import { Pagination } from "@/components/admin/pagination";
import { SearchForm } from "@/components/admin/search-form";
import { UserStatusToggle } from "./status-toggle";

export const dynamic = "force-dynamic";

// Kept out of the component body so the render stays free of impure calls.
function now(): Date {
  return new Date();
}

const ROLE_TONE: Record<string, string> = {
  USER: "bg-emerald-100 text-emerald-700",
  ADMIN: "bg-sky-100 text-sky-700",
  SUPER_ADMIN: "bg-violet-100 text-violet-700",
};

const KINDS = [
  { id: "customers", label: "Customers" },
  { id: "staff", label: "Staff" },
  { id: "suspended", label: "Suspended" },
] as const;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; q?: string; page?: string }>;
}) {
  const admin = await getStaffWith("users.manage");
  if (!admin) return <Forbidden />;
  const canSuspend = can(admin.role, "destructive");

  const sp = await searchParams;
  const kind = KINDS.find((k) => k.id === sp.kind)?.id;
  const q = sp.q?.trim() || undefined;
  const { page, skip, take } = pageParams(sp.page);

  const where: Prisma.UserWhereInput = {
    ...(kind === "customers" ? { role: "USER" } : {}),
    ...(kind === "staff" ? { role: { in: ["ADMIN", "SUPER_ADMIN"] } } : {}),
    ...(kind === "suspended" ? { status: "SUSPENDED" } : {}),
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        _count: { select: { tags: true, orders: true } },
        subscriptions: {
          where: entitledWhere(now()),
          include: { plan: { select: { name: true } } },
          orderBy: { currentPeriodEnd: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.user.count({ where }),
  ]);

  const chip = (active: boolean) =>
    `rounded-lg border px-3 py-1.5 ${
      active
        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary-dark)]"
        : "border-black/15 bg-white hover:bg-black/5"
    }`;
  const kindHref = (k?: string) => {
    const query = new URLSearchParams();
    if (k) query.set("kind", k);
    if (q) query.set("q", q);
    const qs = query.toString();
    return qs ? `/admin/users?${qs}` : "/admin/users";
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Users</h1>
      <p className="mt-1 text-sm text-black/60">
        Customer accounts and their plans. Staff accounts are listed for reference and are managed
        under Admins.
      </p>

      <div className="mt-5 flex flex-wrap gap-2 text-sm">
        <Link href={kindHref()} className={chip(!kind)}>
          Everyone
        </Link>
        {KINDS.map((k) => (
          <Link key={k.id} href={kindHref(k.id)} className={chip(kind === k.id)}>
            {k.label}
          </Link>
        ))}
      </div>

      <div className="mt-4">
        <SearchForm
          action="/admin/users"
          placeholder="Search by name, email or phone"
          defaultValue={q}
          keep={{ kind }}
        />
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-black/10 bg-white">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-black/50 border-b border-black/10">
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Plan</th>
              <th className="py-3 px-4">QR codes</th>
              <th className="py-3 px-4">Orders</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-black/5 last:border-b-0">
                <td className="py-3 px-4">
                  <Link href={`/admin/users/${u.id}`} className="font-medium text-[var(--color-primary-dark)] hover:underline">
                    {u.name}
                  </Link>
                  <div className="text-xs text-black/40">{u.email}</div>
                </td>
                <td className="py-3 px-4">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_TONE[u.role] ?? ""}`}>
                    {roleLabel(u.role)}
                  </span>
                </td>
                <td className="py-3 px-4">
                  {isStaff(u.role) ? "—" : u.subscriptions[0]?.plan.name ?? <span className="text-black/40">No plan</span>}
                </td>
                <td className="py-3 px-4 tabular-nums">{u._count.tags}</td>
                <td className="py-3 px-4 tabular-nums">{u._count.orders}</td>
                <td className="py-3 px-4">
                  <span className={u.status === "SUSPENDED" ? "font-medium text-red-700" : ""}>{u.status}</span>
                </td>
                <td className="py-3 px-4">
                  {isStaff(u.role) ? (
                    <span className="text-xs text-black/40">Protected</span>
                  ) : canSuspend ? (
                    <UserStatusToggle userId={u.id} status={u.status} />
                  ) : null}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={7} className="py-10 px-4 text-center text-sm text-black/50">
                  No accounts match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination basePath="/admin/users" params={{ kind, q }} page={page} total={total} />
    </div>
  );
}
