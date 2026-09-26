import { getStaffWith } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/money";
import { Forbidden } from "@/components/admin/forbidden";

export const dynamic = "force-dynamic";

const statusColors: Record<string, string> = {
  SUCCEEDED: "bg-emerald-100 text-emerald-700",
  PENDING: "bg-amber-100 text-amber-700",
  FAILED: "bg-red-100 text-red-700",
};

export default async function AdminPaymentsPage() {
  if (!(await getStaffWith("money.manage"))) return <Forbidden />;

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
          planPriceCents: true,
          plan: { select: { name: true } },
          user: { select: { name: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  // Split by what the money bought, not by which record the payment hangs off.
  // A plan added to a sticker's checkout is one ORDER payment covering both, so
  // counting by `kind` would credit the whole thing to stickers and report plan
  // revenue trending to zero while plans were in fact selling.
  let stickerRevenue = 0;
  let planRevenue = 0;
  for (const p of payments) {
    if (p.status !== "SUCCEEDED") continue;
    if (p.kind === "SUBSCRIPTION") {
      planRevenue += p.amountCents;
      continue;
    }
    const planPart = p.order?.planPriceCents ?? 0;
    planRevenue += planPart;
    stickerRevenue += Math.max(0, p.amountCents - planPart);
  }
  const succeededTotal = stickerRevenue + planRevenue;

  return (
    <div>
      <h1 className="text-2xl font-bold">Payments</h1>
      <p className="mt-1 text-sm text-black/60">
        All order and plan payments, across every gateway. A checkout that included a plan is one
        payment, split across the two figures below by what it bought.
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
          <p className="text-xs text-black/50">Stickers</p>
          <p className="mt-1 text-2xl font-semibold">{formatPrice(stickerRevenue, "BDT")}</p>
        </div>
        <div className="rounded-lg border border-black/10 p-4">
          <p className="text-xs text-black/50">Plans</p>
          <p className="mt-1 text-2xl font-semibold">{formatPrice(planRevenue, "BDT")}</p>
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
              // An order that carried a plan says so, or the row reads as a
              // sticker sale for an amount the stickers do not explain.
              const forWhat =
                p.kind === "ORDER"
                  ? `Order ${p.order?.orderNumber ?? "—"}` +
                    (p.order?.plan ? ` + ${p.order.plan.name} plan` : "")
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
