import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateTagQrDataUrl } from "@/lib/qr";
import { CreateTagButton } from "./create-tag-button";

const statusColors: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  UNASSIGNED: "bg-black/10 text-black/60",
  LOST: "bg-amber-100 text-amber-700",
  DEACTIVATED: "bg-red-100 text-red-700",
};

export default async function TagsPage() {
  const session = await auth();
  const tags = await prisma.tag.findMany({
    where: { userId: session!.user.id },
    include: { item: true },
    orderBy: { createdAt: "desc" },
  });

  const qrCodes = await Promise.all(tags.map((t) => generateTagQrDataUrl(t.shortCode)));

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tags</h1>
          <p className="mt-1 text-sm text-black/60">
            Generate a QR sticker, then assign it to an item and set what finders see.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <CreateTagButton />
      </div>

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
        {tags.length === 0 && <p className="text-sm text-black/50">No tags yet.</p>}
      </div>
    </div>
  );
}
