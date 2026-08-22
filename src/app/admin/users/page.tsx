import { prisma } from "@/lib/prisma";
import { UserStatusToggle } from "./status-toggle";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    where: { role: "USER" },
    include: { _count: { select: { tags: true } }, subscriptions: { where: { status: "ACTIVE" }, include: { plan: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Users</h1>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-black/50 border-b border-black/10">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Plan</th>
              <th className="py-2 pr-4">Tags</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-black/5">
                <td className="py-2 pr-4">{u.name}</td>
                <td className="py-2 pr-4">{u.email}</td>
                <td className="py-2 pr-4">{u.subscriptions[0]?.plan.name ?? "—"}</td>
                <td className="py-2 pr-4">{u._count.tags}</td>
                <td className="py-2 pr-4">{u.status}</td>
                <td className="py-2 pr-4">
                  <UserStatusToggle userId={u.id} status={u.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
