import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { getStaffWith } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { formatPrice } from "@/lib/money";
import { bucketWhere } from "@/lib/subscription";
import { daysLeft, intervalLabel, subscriptionBucket, type Bucket } from "@/lib/subscription-periods";
import { pageParams } from "@/lib/pagination";
import { Forbidden } from "@/components/admin/forbidden";
import { Pagination } from "@/components/admin/pagination";
import { SearchForm } from "@/components/admin/search-form";
import { BUCKETS, BucketBadge } from "./bucket-badge";

export const dynamic = "force-dynamic";

// Kept out of the component body so the render stays free of impure calls.
function now(): Date {
  return new Date();
}

export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ bucket?: string; q?: string; page?: string }>;
}) {
  const admin = await getStaffWith("console.view");
  if (!admin) return <Forbidden />;
  const seesMoney = can(admin.role, "money.manage");

  const sp = await searchParams;
  const at = now();
  const bucket = BUCKETS.some((b) => b.id === sp.bucket) ? (sp.bucket as Bucket) : null;
  const q = sp.q?.trim() || undefined;
  const { page, skip, take } = pageParams(sp.page);

  const where: Prisma.SubscriptionWhereInput = {
    ...(bucket ? bucketWhere(bucket, at) : {}),
    ...(q
      ? {
          user: {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
            ],
          },
        }
      : {}),
  };

  const [subscriptions, total, counts] = await Promise.all([
    prisma.subscription.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        plan: true,
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { currentPeriodEnd: "asc" },
      skip,
      take,
    }),
    prisma.subscription.count({ where }),
    Promise.all(BUCKETS.map((b) => prisma.subscription.count({ where: bucketWhere(b.id, at) }))),
  ]);

  const tab = (active: boolean) =>
    `rounded-lg border px-3 py-1.5 ${
      active
        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary-dark)]"
        : "border-black/15 bg-white hover:bg-black/5"
    }`;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Subscriptions</h1>
          <p className="mt-1 text-sm text-black/60">
            &ldquo;Active&rdquo; uses the same rule as the scan page: paid up and inside the period.
          </p>
        </div>
        <Link href="/admin/plans" className="text-sm font-medium text-[var(--color-primary-dark)] hover:underline">
          Manage plans →
        </Link>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 text-sm">
        <Link href={q ? `/admin/subscriptions?q=${encodeURIComponent(q)}` : "/admin/subscriptions"} className={tab(!bucket)}>
          All
        </Link>
        {BUCKETS.map((b, i) => (
          <Link
            key={b.id}
            href={`/admin/subscriptions?bucket=${b.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={tab(bucket === b.id)}
          >
            {b.label} ({counts[i]})
          </Link>
        ))}
      </div>

      <div className="mt-4">
        <SearchForm
          action="/admin/subscriptions"
          placeholder="Search by customer name or email"
          defaultValue={q}
          keep={{ bucket: bucket ?? undefined }}
        />
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-black/10 bg-white">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-black/50 border-b border-black/10">
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Plan</th>
              <th className="py-3 px-4">State</th>
              <th className="py-3 px-4">Runs until</th>
              {seesMoney && <th className="py-3 px-4">Last payment</th>}
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((s) => {
              const last = s.payments[0];
              const state = subscriptionBucket(s, at);
              const left = daysLeft(s.currentPeriodEnd, at);
              return (
                <tr key={s.id} className="border-b border-black/5 last:border-b-0 align-top">
                  <td className="py-3 px-4">
                    <Link href={`/admin/subscriptions/${s.id}`} className="font-medium text-[var(--color-primary-dark)] hover:underline">
                      {s.user.name}
                    </Link>
                    <div className="text-xs text-black/40">{s.user.email}</div>
                  </td>
                  <td className="py-3 px-4">
                    {s.plan.name}
                    <div className="text-xs text-black/40">
                      {formatPrice(s.plan.priceCents, s.plan.currency)} / {intervalLabel(s.plan.intervalMonths)}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <BucketBadge bucket={state} complimentary={s.status === "TRIALING"} />
                  </td>
                  <td className="py-3 px-4">
                    {s.currentPeriodEnd.getTime() > 0 ? s.currentPeriodEnd.toLocaleDateString() : "—"}
                    {left > 0 && <div className="text-xs text-black/40">{left} days left</div>}
                  </td>
                  {seesMoney && (
                    <td className="py-3 px-4">
                      {last ? (
                        <>
                          {formatPrice(last.amountCents, last.currency)} · {last.status}
                          <div className="text-xs text-black/40">
                            {last.provider} · {last.createdAt.toLocaleDateString()}
                          </div>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
            {subscriptions.length === 0 && (
              <tr>
                <td colSpan={seesMoney ? 5 : 4} className="py-10 px-4 text-center text-sm text-black/50">
                  No subscriptions match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        basePath="/admin/subscriptions"
        params={{ bucket: bucket ?? undefined, q }}
        page={page}
        total={total}
      />
    </div>
  );
}
