import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { tagUrl } from "@/lib/qr";
import { TagAdminControls } from "./tag-admin-controls";

export const dynamic = "force-dynamic";

export default async function AdminTagDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) redirect("/dashboard");
  const { id } = await params;

  const tag = await prisma.tag.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      product: { select: { name: true } },
      batch: { select: { label: true, createdAt: true } },
      orderItem: { select: { orderId: true } },
      _count: { select: { scanEvents: true, relayMessages: true } },
    },
  });
  if (!tag) notFound();

  const url = tagUrl(tag.shortCode);
  const rows: Array<{ label: string; value: React.ReactNode }> = [
    { label: "Short code", value: <span className="font-mono">{tag.shortCode}</span> },
    { label: "Claim code", value: <span className="font-mono">{tag.claimCode}</span> },
    { label: "Status", value: tag.status },
    { label: "Product", value: tag.product?.name ?? "—" },
    { label: "Internal label", value: tag.internalLabel ?? "—" },
    {
      label: "Owner",
      value: tag.user ? (
        <Link href={`/admin/users/${tag.user.id}`} className="text-emerald-700 hover:underline">
          {tag.user.name} · {tag.user.email}
        </Link>
      ) : (
        "—"
      ),
    },
    {
      label: "Order",
      value: tag.orderItem?.orderId ? (
        <Link
          href={`/admin/orders/${tag.orderItem.orderId}`}
          className="text-emerald-700 hover:underline"
        >
          View order
        </Link>
      ) : (
        "—"
      ),
    },
    {
      label: "Batch",
      value: tag.batch ? `${tag.batch.label} (${tag.batch.createdAt.toLocaleDateString()})` : "—",
    },
    { label: "Scans", value: tag._count.scanEvents },
    { label: "Messages", value: tag._count.relayMessages },
    {
      label: "Public page",
      value: (
        <a href={url} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline">
          {url}
        </a>
      ),
    },
  ];

  return (
    <div>
      <Link href="/admin/tags" className="text-sm text-black/50 hover:underline">
        ← Tag inventory
      </Link>
      <h1 className="mt-2 text-2xl font-bold font-mono">{tag.shortCode}</h1>

      <dl className="mt-6 max-w-xl divide-y divide-black/10 rounded-lg border border-black/10 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-4 px-4 py-2.5">
            <dt className="text-black/50">{row.label}</dt>
            <dd className="text-right">{row.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6">
        <TagAdminControls tagId={tag.id} status={tag.status} />
      </div>
    </div>
  );
}
