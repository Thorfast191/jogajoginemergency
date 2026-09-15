import Link from "next/link";
import { notFound } from "next/navigation";
import { getStaffWith } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { tagUrl } from "@/lib/qr";
import { summarizeUserAgent } from "@/lib/user-agent";
import { can } from "@/lib/permissions";
import { Forbidden } from "@/components/admin/forbidden";
import { TagAdminControls } from "./tag-admin-controls";

export const dynamic = "force-dynamic";

export default async function AdminTagDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await getStaffWith("tags.manage");
  if (!admin) return <Forbidden />;

  const tag = await prisma.tag.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, status: true } },
      product: { select: { name: true, slug: true } },
      theme: { select: { name: true } },
      orderItem: { select: { orderId: true, order: { select: { orderNumber: true } } } },
      _count: { select: { scanEvents: true, relayMessages: true, abuseReports: true } },
    },
  });
  if (!tag) notFound();

  const scans = await prisma.scanEvent.findMany({
    where: { tagId: tag.id },
    orderBy: { scannedAt: "desc" },
    take: 20,
  });

  const facts: Array<[string, React.ReactNode]> = [
    ["Public URL", <span key="u" className="font-mono text-xs">{tagUrl(tag.shortCode)}</span>],
    [
      "Owner",
      <Link key="o" href={`/admin/users/${tag.user.id}`} className="text-emerald-700 hover:underline">
        {tag.user.name} ({tag.user.email})
      </Link>,
    ],
    ["Account status", tag.user.status],
    ["Product", tag.product?.name ?? "—"],
    ["Theme", tag.theme?.name ?? "Default"],
    [
      "Paid by order",
      tag.orderItem?.order ? (
        <Link
          key="ord"
          href={`/admin/orders/${tag.orderItem.orderId}`}
          className="text-emerald-700 hover:underline"
        >
          {tag.orderItem.order.orderNumber}
        </Link>
      ) : (
        "—"
      ),
    ],
    ["Private label", tag.internalLabel ?? "—"],
    ["Created", tag.createdAt.toLocaleString()],
    ["Scans", tag._count.scanEvents],
    ["Relay messages", tag._count.relayMessages],
    ["Abuse reports", tag._count.abuseReports],
  ];

  return (
    <div>
      <Link href="/admin/tags" className="text-sm text-black/50 hover:underline">
        ← Back to tags
      </Link>
      <h1 className="mt-2 font-mono text-2xl font-bold">/t/{tag.shortCode}</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div>
          <dl className="divide-y divide-black/10 rounded-xl border border-black/10 bg-white text-sm">
            {facts.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 px-4 py-2.5">
                <dt className="text-black/50">{label}</dt>
                <dd className="text-right">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6">
            <h2 className="font-semibold">Status</h2>
            <div className="mt-2">
              <TagAdminControls
                tagId={tag.id}
                status={tag.status}
                canDeactivate={can(admin.role, "destructive")}
              />
            </div>
          </div>
        </div>

        <div>
          <h2 className="font-semibold">Sticker</h2>
          <div className="mt-3 rounded-2xl border border-black/10 bg-white p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/tags/${tag.id}/sticker?size=thumb`}
              alt="The customer's sticker with this QR in the centre"
              className="mx-auto w-full max-w-[16rem] rounded-xl"
            />
            <p className="mt-3 flex flex-wrap justify-center gap-3 text-sm">
              <a href={`/api/tags/${tag.id}/sticker?download=1`} className="text-[var(--color-primary-dark)] hover:underline">
                Sticker PNG
              </a>
              <a href={`/api/tags/${tag.id}/sticker?format=pdf`} className="text-[var(--color-primary-dark)] hover:underline">
                Sticker PDF
              </a>
              <a href={`/api/tags/${tag.id}/qr`} className="text-[var(--color-primary-dark)] hover:underline">
                QR only
              </a>
            </p>
          </div>

          <h2 className="mt-8 font-semibold">Recent scans</h2>
          {scans.length === 0 ? (
            <p className="mt-2 text-sm text-black/50">No scans yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-black/10 rounded-xl border border-black/10 bg-white">
              {scans.map((s) => (
                <li key={s.id} className="flex justify-between gap-3 p-3 text-sm">
                  <span>{s.scannedAt.toLocaleString()}</span>
                  <span className="text-right text-xs text-black/50">
                    {summarizeUserAgent(s.userAgent)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
