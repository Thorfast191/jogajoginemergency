import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/money";

export const dynamic = "force-dynamic";

const statusColors: Record<string, string> = {
  SUCCEEDED: "bg-emerald-100 text-emerald-700",
  PENDING: "bg-amber-100 text-amber-700",
  FAILED: "bg-red-100 text-red-700",
};

export default async function AdminPaymentsPage() {
  if (!(await getAdmin())) redirect("/dashboard");

  const payments = await prisma.payment.findMany({
    include: {
      subscription: {
        select: {
          user: { select: { name: true, email: true } },
          plan: { select: { name: true } },
        },
      },
      order: {
        select: {
          orderNumber: true,
          user: { select: { name: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  const succeededByKind = { ORDER: 0, SUBSCRIPTION: 0 };
  for (const p of payments) {
    if (p.status === "SUCCEEDED") succeededByKind[p.kind] += p.amountCents;
  }
  const succeededTotal = succeededByKind.ORDER + succeededByKind.SUBSCRIPTION;

  return (
    <div>
      <h1 className="text-2xl font-bold">Payments</h1>
      <p className="mt-1 text-sm text-black/60">
        All order and subscription payments. No live gateway is wired up yet — these are{" "}
        <span className="font-mono">DEMO</span> records.
      </p>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-black/10 p-4">
          <p className="text-xs text-black/50">Records</p>
          <p className="mt-1 text-2xl font-semibold">{payments.length}</p>
        </div>
        <div className="rounded-lg border border-black/10 p-4">
          <p className="text-xs text-black/50">Succeeded total</p>
          <p className="mt-1 text-2xl font-semibold">{formatPrice(succeededTotal, "BDT")}</p>
        </div>
        <div className="rounded-lg border border-black/10 p-4">
          <p className="text-xs text-black/50">Orders</p>
          <p className="mt-1 text-2xl font-semibold">{formatPrice(succeededByKind.ORDER, "BDT")}</p>
        </div>
        <div className="rounded-lg border border-black/10 p-4">
          <p className="text-xs text-black/50">Subscriptions</p>
          <p className="mt-1 text-2xl font-semibold">
            {formatPrice(succeededByKind.SUBSCRIPTION, "BDT")}
          </p>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-black/10">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-black/50 border-b border-black/10">
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">For</th>
              <th className="py-3 px-4">Amount</th>
              <th className="py-3 px-4">Provider</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Date</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => {
              const who = p.order?.user ?? p.subscription?.user;
              const forWhat =
                p.kind === "ORDER"
                  ? `Order ${p.order?.orderNumber ?? "—"}`
                  : `${p.subscription?.plan.name ?? "—"} plan`;
              return (
                <tr key={p.id} className="border-b border-black/5 last:border-b-0 align-top">
                  <td className="py-3 px-4">
                    {who?.name ?? "—"}
                    <div className="text-xs text-black/40">{who?.email}</div>
                  </td>
                  <td className="py-3 px-4">{forWhat}</td>
                  <td className="py-3 px-4">{formatPrice(p.amountCents, p.currency)}</td>
                  <td className="py-3 px-4">{p.provider}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        statusColors[p.status] ?? "bg-black/10 text-black/60"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">{p.createdAt.toLocaleDateString()}</td>
                </tr>
              );
            })}
            {payments.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 px-4 text-center text-sm text-black/50">
                  No payments recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
