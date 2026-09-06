import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { generateTagQrDataUrl } from "@/lib/qr";
import { slotBalanceForUser } from "@/lib/slots-server";
import { userIsEntitled } from "@/lib/subscription";
import { EmptyTags } from "@/components/illustrations";
import { PageHeader, Badge } from "@/components/ui";
import { GenerateTagForm } from "./generate-tag-form";

export const dynamic = "force-dynamic";

const TONE: Record<string, "emerald" | "amber" | "red"> = {
  ACTIVE: "emerald",
  LOST: "amber",
  DEACTIVATED: "red",
};

export default async function TagsPage() {
  const user = await getCustomer();
  if (!user) redirect("/login");

  const [tags, balance, entitled] = await Promise.all([
    prisma.tag.findMany({
      where: { userId: user.id },
      include: { product: true, theme: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    slotBalanceForUser(user.id),
    userIsEntitled(user.id),
  ]);

  const qrCodes = await Promise.all(tags.map((t) => generateTagQrDataUrl(t.shortCode)));

  return (
    <div>
      <PageHeader
        title="My QR codes"
        subtitle={
          <>
            Generate a code for each sticker you bought, then print or stick it on. What a finder
            sees comes from your{" "}
            <Link href="/dashboard/profile" className="text-[var(--color-primary)] hover:underline">
              profile
            </Link>
            .
          </>
        }
      />

      {!entitled && tags.length > 0 && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Your codes scan, but they don&apos;t show your information yet.</strong> A
          subscription is what publishes your page.{" "}
          <Link href="/dashboard/subscription" className="font-semibold hover:underline">
            Subscribe →
          </Link>
        </p>
      )}

      <div className="mt-6">
        <GenerateTagForm available={balance.available} owned={balance.owned} />
      </div>

      {tags.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-black/15 p-10 text-center">
          <div className="flex justify-center anim-float">
            <EmptyTags />
          </div>
          <p className="mt-4 font-semibold">No QR codes yet</p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {tags.map((tag, i) => (
            <li key={tag.id} className="rounded-2xl border border-black/10 bg-white p-4 hover-lift">
              <Link href={`/dashboard/tags/${tag.id}`} className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCodes[i]} alt="" className="h-20 w-20 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {tag.internalLabel ?? tag.product?.name ?? "Untitled"}
                  </p>
                  <p className="truncate font-mono text-xs text-black/40">/t/{tag.shortCode}</p>
                  <p className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge tone={TONE[tag.status] ?? "neutral"}>{tag.status}</Badge>
                    {tag.theme && <span className="text-xs text-black/40">{tag.theme.name}</span>}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
