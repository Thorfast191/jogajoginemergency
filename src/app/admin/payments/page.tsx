import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { getStaffWith } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/money";
import { pageParams } from "@/lib/pagination";
import { Forbidden } from "@/components/admin/forbidden";
import { Pagination } from "@/components/admin/pagination";

export const dynamic = "force-dynamic";

const statusColors: Record<string, string> = {
  SUCCEEDED: "bg-emerald-100 text-emerald-700",
  PENDING: "bg-amber-100 text-amber-700",
  FAILED: "bg-red-100 text-red-700",
};

// Mirrors the PaymentStatus enum — a payment is never "refunded"; the order is.
const STATUSES = ["SUCCEEDED", "PENDING", "FAILED", "CANCELLED"] as const;
type Status = (typeof STATUSES)[number];

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  if (!(await getStaffWith("money.manage"))) return <Forbidden />;

  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as Status) ? (sp.status as Status) : undefined;
  const { page, skip, take } = pageParams(sp.page);
  const where: Prisma.PaymentWhereInput = status ? { status } : {};

  const payments = await prisma.payment.findMany({
    where,
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
    skip,
    take,
  });

  // The figures are aggregated across every payment, never over the page being
  // shown — a paged list whose totals only counted 50 rows would be worse than
  // no totals at all.
  //
  // Split by what the money bought, not by which record the payment hangs off.
  // A plan added to a sticker's checkout is one ORDER payment covering both, so
  // counting by `kind` would credit the whole thing to stickers and report plan
  // revenue trending to zero while plans were in fact selling.
  const [total, byStatus, subsSum, orderSum, planInOrders] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.payment.aggregate({
      where: { status: "SUCCEEDED", kind: "SUBSCRIPTION" },
      _sum: { amountCents: true },
    }),
    prisma.payment.aggregate({
      where: { status: "SUCCEEDED", kind: "ORDER" },
      _sum: { amountCents: true },
    }),
    // The plan's share of orders that were actually paid for.
    prisma.order.aggregate({
      where: { planId: { not: null }, payments: { some: { status: "SUCCEEDED", kind: "ORDER" } } },
      _sum: { planPriceCents: true },
    }),
  ]);

  const planPart = planInOrders._sum.planPriceCents ?? 0;
  const planRevenue = (subsSum._sum.amountCents ?? 0) + planPart;
  const stickerRevenue = Math.max(0, (orderSum._sum.amountCents ?? 0) - planPart);
  const succeededTotal = stickerRevenue + planRevenue;
  const count = (s: string) => byStatus.find((g) => g.status === s)?._count._all ?? 0;
  const allCount = byStatus.reduce((n, g) => n + g._count._all, 0);

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
          <p className="mt-1 text-2xl font-semibold">{allCount}</p>
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

      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <Link
          href="/admin/payments"
          className={!status ? "font-semibold" : "text-black/50 hover:underline"}
        >
          All <span className="text-black/40">({allCount})</span>
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/payments?status=${s}`}
            className={status === s ? "font-semibold" : "text-black/50 hover:underline"}
          >
            {s} <span className="text-black/40">({count(s)})</span>
          </Link>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-black/10">
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
                  {status ? `No ${status.toLowerCase()} payments.` : "No payments recorded yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination basePath="/admin/payments" params={{ status }} page={page} total={total} />
    </div>
  );
}
