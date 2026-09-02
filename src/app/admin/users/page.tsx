import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { UserStatusToggle } from "./status-toggle";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  if (!(await getAdmin())) redirect("/dashboard");

  const users = await prisma.user.findMany({
    include: {
      _count: { select: { tags: true, items: true } },
      subscriptions: { where: { status: "ACTIVE" }, include: { plan: true }, orderBy: { createdAt: "desc" } },
    },
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Users</h1>
      <p className="mt-1 text-sm text-black/60">
        Customer accounts and their entitlement. Admin accounts are shown for reference and are
        protected from changes here.
      </p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-black/10">
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
                <td className="py-3 px-4">{u.name}</td>
                <td className="py-3 px-4">{u.email}</td>
                <td className="py-3 px-4">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.role === "ADMIN" ? "bg-black/10 text-black/70" : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="py-3 px-4">
                  {u.role === "ADMIN" ? "—" : u.subscriptions[0]?.plan.name ?? "No plan"}
                </td>
                <td className="py-3 px-4">{u._count.tags}</td>
                <td className="py-3 px-4">{u.status}</td>
                <td className="py-3 px-4">
                  {u.role === "ADMIN" ? (
                    <span className="text-xs text-black/40">Protected</span>
                  ) : (
                    <UserStatusToggle userId={u.id} status={u.status} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
