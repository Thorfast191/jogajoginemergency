import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const user = await getCustomer();
  if (!user) redirect("/login");

  const { order: orderNumber } = await searchParams;
  if (!orderNumber) notFound();

  const order = await prisma.order.findFirst({
    where: { orderNumber, userId: user.id },
    include: { items: { include: { product: true, tags: true } } },
  });
  if (!order) notFound();

  const profile = await prisma.emergencyProfile.findUnique({ where: { userId: user.id } });
  const tags = order.items.flatMap((i) => i.tags);

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-2xl font-bold">Order confirmed 🎉</h1>
      <p className="mt-1 text-sm text-black/60">
        Order <span className="font-mono">{order.orderNumber}</span> — your tags are live now.
      </p>

      {!profile && (
        <div className="mt-6 rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm">
          Your tags work, but they won&apos;t show anything useful until you add your emergency
          info.{" "}
          <Link href="/dashboard/profile" className="font-medium text-emerald-700 hover:underline">
            Set up your profile →
          </Link>
        </div>
      )}

      <div className="mt-8">
        <h2 className="font-semibold">Your new tags</h2>
        <ul className="mt-3 space-y-2">
          {tags.map((t) => (
            <li key={t.id} className="rounded-lg border border-black/10 p-3 text-sm flex justify-between">
              <span className="font-mono">/t/{t.shortCode}</span>
              <span className="text-black/50">
                claim code <span className="font-mono">{t.claimCode}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-black/40">
          The claim code is printed on the physical sticker — keep it if you ever need to move the
          tag to another account.
        </p>
      </div>

      <div className="mt-8 flex gap-3">
        <Link
          href="/dashboard/profile"
          className="rounded-md bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700"
        >
          Set up emergency info
        </Link>
        <Link
          href="/dashboard/tags"
          className="rounded-md border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/5"
        >
          View my tags
        </Link>
      </div>
    </div>
  );
}
