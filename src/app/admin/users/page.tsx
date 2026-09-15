import Link from "next/link";
import { getStaffWith } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { can, isStaff, roleLabel } from "@/lib/permissions";
import { Forbidden } from "@/components/admin/forbidden";
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

export default async function AdminUsersPage() {
  const admin = await getStaffWith("users.manage");
  if (!admin) return <Forbidden />;
  const canSuspend = can(admin.role, "destructive");

  const users = await prisma.user.findMany({
    include: {
      _count: { select: { tags: true } },
      subscriptions: {
        where: { status: { in: ["ACTIVE", "TRIALING"] }, currentPeriodEnd: { gt: now() } },
        include: { plan: true },
        orderBy: { currentPeriodEnd: "desc" },
      },
    },
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Users</h1>
      <p className="mt-1 text-sm text-black/60">
        Customer accounts and their entitlement. Admin accounts are shown for reference and are
        managed under Admins.
      </p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-black/10 bg-white">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-black/50 border-b border-black/10">
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Plan</th>
              <th className="py-3 px-4">Tags</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-black/5 last:border-b-0">
                <td className="py-3 px-4">
                  <Link href={`/admin/users/${u.id}`} className="text-[var(--color-primary-dark)] hover:underline">
                    {u.name}
                  </Link>
                </td>
                <td className="py-3 px-4">{u.email}</td>
                <td className="py-3 px-4">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_TONE[u.role] ?? ""}`}>
                    {roleLabel(u.role)}
                  </span>
                </td>
                <td className="py-3 px-4">
                  {isStaff(u.role) ? "—" : u.subscriptions[0]?.plan.name ?? "No plan"}
                </td>
                <td className="py-3 px-4">{u._count.tags}</td>
                <td className="py-3 px-4">{u.status}</td>
                <td className="py-3 px-4">
                  {isStaff(u.role) ? (
                    <span className="text-xs text-black/40">Protected</span>
                  ) : canSuspend ? (
                    <UserStatusToggle userId={u.id} status={u.status} />
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
