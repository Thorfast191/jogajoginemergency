import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateTagQrDataUrl, tagUrl } from "@/lib/qr";
import { TagSettingsForm } from "./tag-settings-form";

export default async function TagDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const [tag, items, scans] = await Promise.all([
    prisma.tag.findFirst({ where: { id, userId: session!.user.id } }),
    prisma.item.findMany({ where: { userId: session!.user.id }, select: { id: true, label: true } }),
    prisma.scanEvent.findMany({
      where: { tag: { id, userId: session!.user.id } },
      orderBy: { scannedAt: "desc" },
      take: 20,
    }),
  ]);

  if (!tag) notFound();

  const qrDataUrl = await generateTagQrDataUrl(tag.shortCode);
  const url = tagUrl(tag.shortCode);

  return (
    <div>
      <Link href="/dashboard/tags" className="text-sm text-black/50 hover:underline">
        ← Back to tags
      </Link>
      <h1 className="text-2xl font-bold mt-2">Tag /t/{tag.shortCode}</h1>

      <div className="mt-6 grid sm:grid-cols-2 gap-8">
        <div>
          <div className="rounded-lg border border-black/10 p-6 flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="QR code" className="w-48 h-48" />
            <p className="mt-3 text-xs font-mono text-black/50 break-all text-center">{url}</p>
            <div className="mt-4 flex gap-2">
              <a
                href={`/api/tags/${tag.id}/qr`}
                download
                className="rounded-md bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700"
              >
                Download PNG
              </a>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/5"
              >
                View public page
              </a>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="font-semibold">Scan history</h2>
            {scans.length === 0 ? (
              <p className="mt-2 text-sm text-black/50">No scans yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-black/10 rounded-lg border border-black/10">
                {scans.map((scan) => (
                  <li key={scan.id} className="p-3 text-sm flex justify-between">
                    <span>{scan.scannedAt.toLocaleString()}</span>
                    <span className="text-black/50">
                      {[scan.approxCity, scan.approxCountry].filter(Boolean).join(", ") || "Unknown location"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <h2 className="font-semibold mb-3">Settings</h2>
          <TagSettingsForm tag={tag} items={items} />
        </div>
      </div>
    </div>
  );
}
