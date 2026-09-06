import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { slotBalanceForUser } from "@/lib/slots-server";
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
  if (!order) redirect("/dashboard/orders");

  const [balance, entitled] = await Promise.all([
    slotBalanceForUser(user.id),
    userIsEntitled(user.id),
  ]);

  const bought = order.items.reduce((n, i) => n + i.quantity * i.product.qrSlots, 0);

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
        <Step n={1} title="Generate your QR codes" done={balance.used > 0}>
          You have {balance.available} to make. Each one gets its own page.
        </Step>
        <Step n={2} title="Add your emergency information" done={false}>
          Blood group, allergies, who to call — and choose exactly what a finder sees.
        </Step>
        <Step n={3} title="Publish your page" done={entitled}>
          {entitled
            ? "Your subscription is active, so your page is live."
            : "A subscription is what makes your page show your information."}
        </Step>
      </ol>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/dashboard/tags" className={ButtonLinkClass()}>
          Generate my QR codes
        </Link>
        <Link
          href="/dashboard/profile"
          className="rounded-xl border border-black/15 px-6 py-3 font-semibold hover:bg-black/5"
        >
          Set up my information
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
