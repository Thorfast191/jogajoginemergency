import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { generateTagQrDataUrl } from "@/lib/qr";

const statusColors: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  UNASSIGNED: "bg-black/10 text-black/60",
  LOST: "bg-amber-100 text-amber-700",
  DEACTIVATED: "bg-red-100 text-red-700",
};

export default async function TagsPage() {
  const user = await getCustomer();
  if (!user) redirect("/login");

  const [subscription, tags] = await Promise.all([
    prisma.subscription.findFirst({
      where: { userId: user.id, status: "ACTIVE" },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.tag.findMany({
      where: { userId: user.id },
      include: { item: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const qrCodes = await Promise.all(tags.map((t) => generateTagQrDataUrl(t.shortCode)));
  const entitlement = subscription
    ? `${tags.length} of ${subscription.plan.maxTags} tags on your ${subscription.plan.name} plan`
    : `${tags.length} tag${tags.length === 1 ? "" : "s"}`;

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold">My Tags</h1>
        <p className="mt-1 text-sm text-black/60">
          The QR tags assigned to your account. Attach one to an item and choose what finders see.
        </p>
        <p className="mt-1 text-xs text-black/40">{entitlement}</p>
      </div>

      {tags.length === 0 && (
        <div className="mt-6 rounded-lg border border-dashed border-black/15 p-6 text-sm text-black/60">
          You don&apos;t have any tags yet. Tags are issued to your account by Jogajog based on
          your subscription — {subscription ? "contact support if you expected one here." : "pick a plan on the Billing page to get started."}
        </div>
      )}

      <div className="mt-6 grid sm:grid-cols-2 gap-4">
        {tags.map((tag, i) => (
          <Link
            key={tag.id}
            href={`/dashboard/tags/${tag.id}`}
            className="rounded-lg border border-black/10 p-4 flex gap-4 hover:border-emerald-600"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrCodes[i]} alt={`QR code for tag ${tag.shortCode}`} className="w-20 h-20" />
            <div className="flex-1">
              <p className="font-medium">{tag.item?.label ?? tag.publicDisplayName ?? "Unassigned tag"}</p>
              <p className="text-xs text-black/50 font-mono">/t/{tag.shortCode}</p>
              <span
                className={`inline-block mt-2 rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[tag.status]}`}
              >
                {tag.status}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
