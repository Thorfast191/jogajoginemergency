import { prisma } from "@/lib/prisma";

export default async function AdminSubscriptionsPage() {
  const subscriptions = await prisma.subscription.findMany({
    include: { user: { select: { name: true, email: true } }, plan: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Subscriptions</h1>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-black/50 border-b border-black/10">
              <th className="py-2 pr-4">User</th>
              <th className="py-2 pr-4">Plan</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Provider</th>
              <th className="py-2 pr-4">Renews</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((s) => (
              <tr key={s.id} className="border-b border-black/5">
                <td className="py-2 pr-4">
                  {s.user.name}
                  <div className="text-xs text-black/40">{s.user.email}</div>
                </td>
                <td className="py-2 pr-4">{s.plan.name}</td>
                <td className="py-2 pr-4">{s.status}</td>
                <td className="py-2 pr-4">{s.provider}</td>
                <td className="py-2 pr-4">{s.currentPeriodEnd.toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
