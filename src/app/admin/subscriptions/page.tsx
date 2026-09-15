import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function money(cents: number, currency: string) {
  return `${currency} ${(cents / 100).toLocaleString()}`;
}

export default async function AdminSubscriptionsPage() {
  if (!(await getAdmin())) redirect("/dashboard");

  const subscriptions = await prisma.subscription.findMany({
    include: {
      user: { select: { name: true, email: true } },
      plan: true,
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Subscriptions</h1>
      <p className="mt-1 text-sm text-black/60">
        Customer subscriptions and entitlement.
      </p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-black/10">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-black/50 border-b border-black/10">
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Plan</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Provider</th>
              <th className="py-3 px-4">Period ends</th>
              <th className="py-3 px-4">Last payment</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((s) => {
              const last = s.payments[0];
              return (
                <tr key={s.id} className="border-b border-black/5 last:border-b-0 align-top">
                  <td className="py-3 px-4">
                    {s.user.name}
                    <div className="text-xs text-black/40">{s.user.email}</div>
                  </td>
                  <td className="py-3 px-4">
                    {s.plan.name}
                    <div className="text-xs text-black/40">
                      {(s.plan.priceCents / 100).toLocaleString()} {s.plan.currency}/yr
                    </div>
                  </td>
                  <td className="py-3 px-4">{s.status}</td>
                  <td className="py-3 px-4">{s.provider}</td>
                  <td className="py-3 px-4">{s.currentPeriodEnd.toLocaleDateString()}</td>
                  <td className="py-3 px-4">
                    {last ? (
                      <>
                        {money(last.amountCents, last.currency)} · {last.status}
                        <div className="text-xs text-black/40">{last.createdAt.toLocaleDateString()}</div>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
            {subscriptions.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 px-4 text-center text-sm text-black/50">
                  No subscriptions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
