import { notFound, redirect } from "next/navigation";
import { getCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/money";
import { isConfigured } from "@/lib/payments/registry";

export const dynamic = "force-dynamic";

// The DEMO gateway's "hosted payment page".
//
// A real gateway takes the customer off-site and sends their browser back to
// /api/payments/callback. The demo used to redirect straight to the callback,
// but a Server Action redirect to our own origin is a client-side navigation:
// the callback ran inside the action's render, the browser never requested it,
// so the cookie it clears (the cart) survived the purchase and the address bar
// was left showing the callback. Stopping here first makes the last hop a
// real page load, exactly like a provider's return — and lets a tester choose
// the outcome.

export default async function DemoGatewayPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string | string[] }>;
}) {
  if (!isConfigured("DEMO")) notFound();

  const { payment: paymentId } = await searchParams;
  if (typeof paymentId !== "string") notFound();

  const user = await getCustomer();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/checkout/demo?payment=${paymentId}`)}`);

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      provider: true,
      status: true,
      amountCents: true,
      currency: true,
      order: { select: { userId: true, orderNumber: true } },
      subscription: { select: { userId: true, plan: { select: { name: true } } } },
    },
  });
  const ownerId = payment?.order?.userId ?? payment?.subscription?.userId;
  if (!payment || payment.provider !== "DEMO" || ownerId !== user.id) notFound();

  const what = payment.order
    ? `Order ${payment.order.orderNumber}`
    : `${payment.subscription?.plan.name ?? "Plan"} subscription`;
  const callback = (outcome: "success" | "fail" | "cancel") =>
    `/api/payments/callback?payment=${payment.id}&demo=${outcome}`;
  // Plain anchors on purpose: next/link would make this a client-side
  // navigation again, which is the bug this page exists to avoid.
  const link = "block rounded-xl px-4 py-3 text-center font-semibold";

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
        Demo payment · no money moves
      </p>
      <h1 className="mt-2 text-3xl font-bold">
        {formatPrice(payment.amountCents, payment.currency)}
      </h1>
      <p className="mt-1 text-sm text-black/60">{what}</p>

      {payment.status === "PENDING" ? (
        <div className="mt-8 space-y-3">
          <a href={callback("success")} className={`${link} bg-[var(--color-primary)] text-white`}>
            Pay (demo)
          </a>
          <a href={callback("fail")} className={`${link} border border-black/15 hover:bg-black/5`}>
            Simulate a declined payment
          </a>
          <a href={callback("cancel")} className={`${link} border border-black/15 hover:bg-black/5`}>
            Cancel
          </a>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          <p className="text-sm text-black/60">
            This payment is already {payment.status.toLowerCase()}.
          </p>
          <a href={callback("success")} className={`${link} border border-black/15 hover:bg-black/5`}>
            Continue
          </a>
        </div>
      )}
    </div>
  );
}
