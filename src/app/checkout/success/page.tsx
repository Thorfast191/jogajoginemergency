import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { slotBalanceForUser } from "@/lib/slots-server";
import { orderReadiness } from "@/lib/print-server";
import { clientHref } from "@/lib/hosts";
import { userIsEntitled } from "@/lib/subscription";
import { MascotCheer } from "@/components/illustrations";
import { ButtonLinkClass } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const user = await getCustomer();
  if (!user) redirect("/login");

  const { order: orderNumber } = await searchParams;
  const order = orderNumber
    ? await prisma.order.findFirst({
        where: { orderNumber, userId: user.id },
        include: { items: { include: { product: true } } },
      })
    : null;
  if (!order) redirect(clientHref("/dashboard/orders"));

  // Only a paid order is confirmed. Anyone can reach this URL for their own
  // pending or cancelled order, and "Order confirmed" there would be false.
  if (order.status !== "PAID") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <h1 className="text-3xl font-bold">This order isn&apos;t paid</h1>
        <p className="mt-2 text-sm text-black/60">
          Order <span className="font-mono">{order.orderNumber}</span> is{" "}
          {order.status === "CANCELLED" ? "cancelled" : "still waiting for payment"}, so no QR codes
          have been added for it.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/cart" className={ButtonLinkClass()}>
            Back to my cart
          </Link>
          <Link
            href={`/dashboard/orders/${order.id}`}
            className="rounded-xl border border-black/15 px-6 py-3 font-semibold hover:bg-black/5"
          >
            View the order
          </Link>
        </div>
      </div>
    );
  }

  const [balance, readiness, entitled, profile] = await Promise.all([
    slotBalanceForUser(user.id),
    orderReadiness(order.id),
    userIsEntitled(user.id),
    prisma.emergencyProfile.findUnique({
      where: { userId: user.id },
      select: { emergencyMessage: true, _count: { select: { contacts: true } } },
    }),
  ]);

  const bought = order.items.reduce((n, i) => n + i.quantity * i.product.qrSlots, 0);
  // Paying mints this order's codes (see src/lib/tag-issue.ts), so there is
  // normally nothing to press here. Judged on *this* order, not the account
  // balance: an unspent slot left over from an older purchase would otherwise
  // make a finished order read as unfinished.
  const missing = Math.max(0, readiness.needed - readiness.generated);
  const ready = missing === 0;
  // Slots on other orders the customer never used. Worth a nudge, not a step.
  const elsewhere = Math.max(0, balance.available - missing);
  const profileReady = !!profile && (!!profile.emergencyMessage || profile._count.contacts > 0);

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <MascotCheer className="h-20 w-20 text-[var(--color-primary)] anim-float" />
      <h1 className="mt-3 text-3xl font-bold">Order confirmed</h1>
      <p className="mt-1 text-sm text-black/60">
        Order <span className="font-mono">{order.orderNumber}</span> — that&apos;s{" "}
        <strong>
          {bought} QR {bought === 1 ? "code" : "codes"}
        </strong>{" "}
        added to your account.
      </p>

      <ol className="mt-8 space-y-3">
        <Step
          n={1}
          title={ready ? "Your QR codes are made" : "Finish making your QR codes"}
          done={ready}
        >
          {ready
            ? "Nothing to do — we're printing them into the middle of your stickers and shipping them to you."
            : `${missing} still to make. We print and ship as soon as they're done.`}
        </Step>
        <Step n={2} title="Add your emergency information" done={profileReady}>
          Blood group, allergies, who to call — and choose exactly what a finder sees.
        </Step>
        <Step n={3} title="Publish your page" done={entitled}>
          {entitled
            ? "Your plan is active, so your page is live."
            : "A plan is what makes your page show your information. You can add one any time."}
        </Step>
      </ol>

      {elsewhere > 0 && (
        <p className="mt-4 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black/60">
          You also have {elsewhere} unused QR {elsewhere === 1 ? "code" : "codes"} from an earlier
          order.{" "}
          <Link href="/dashboard/tags" className="font-medium text-[var(--color-primary)] hover:underline">
            Make {elsewhere === 1 ? "it" : "them"}
          </Link>{" "}
          whenever you like.
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/dashboard/profile" className={ButtonLinkClass()}>
          {profileReady ? "Review my information" : "Set up my information"}
        </Link>
        <Link
          href="/dashboard/tags"
          className="rounded-xl border border-black/15 px-6 py-3 font-semibold hover:bg-black/5"
        >
          {ready ? "See my QR codes" : "Generate my QR codes"}
        </Link>
      </div>
    </div>
  );
}

function Step({
  n,
  title,
  done,
  children,
}: {
  n: number;
  title: string;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3 rounded-xl border border-black/10 bg-white p-4">
      <span
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold ${
          done ? "bg-[var(--color-primary)] text-white" : "bg-black/[0.06] text-black/50"
        }`}
        aria-hidden="true"
      >
        {done ? "✓" : n}
      </span>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-sm text-black/60">{children}</p>
      </div>
    </li>
  );
}
