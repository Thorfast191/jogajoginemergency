import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { generateTagQrDataUrl } from "@/lib/qr";

const statusColors: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  ALLOCATED: "bg-black/10 text-black/60",
  UNASSIGNED: "bg-black/10 text-black/60",
  LOST: "bg-amber-100 text-amber-700",
  DEACTIVATED: "bg-red-100 text-red-700",
};

export default async function TagsPage() {
  const user = await getCustomer();
  if (!user) redirect("/login");

  const tags = await prisma.tag.findMany({
    where: { userId: user.id },
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });

  const qrCodes = await Promise.all(tags.map((t) => generateTagQrDataUrl(t.shortCode)));

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Tags</h1>
          <p className="mt-1 text-sm text-black/60">
            The physical QR tags linked to your account. What finders see comes from your{" "}
            <Link href="/dashboard/profile" className="text-emerald-700 hover:underline">
              emergency profile
            </Link>
            .
          </p>
        </div>
      </div>

      {tags.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-black/15 p-6 text-sm text-black/60">
          <p>You don&apos;t have any tags yet.</p>
          <div className="mt-3 flex gap-3">
            <Link
              href="/shop"
              className="rounded-md bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700"
            >
              Buy a sticker
            </Link>
            <Link
              href="/claim"
              className="rounded-md border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/5"
            >
              I have a claim code
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          {tags.map((tag, i) => (
            <Link
              key={tag.id}
              href={`/dashboard/tags/${tag.id}`}
              className="rounded-lg border border-black/10 p-4 flex gap-4 hover:border-emerald-600"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrCodes[i]} alt={`QR code for ${tag.shortCode}`} className="w-20 h-20" />
              <div className="flex-1">
                <p className="font-medium">{tag.internalLabel ?? tag.product?.name ?? "Tag"}</p>
                <p className="text-xs text-black/50 font-mono">/t/{tag.shortCode}</p>
                <span
                  className={`inline-block mt-2 rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[tag.status] ?? ""}`}
                >
                  {tag.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
