import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { generateTagQrDataUrl, tagUrl } from "@/lib/qr";
import { summarizeUserAgent } from "@/lib/user-agent";
import { TagSettingsForm } from "./tag-settings-form";
import { ThemePicker } from "./theme-picker";
import type { ThemeSkin } from "@/lib/themes";

export default async function TagDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCustomer();
  if (!user) redirect("/login");

  const [tag, scans, messages, themes] = await Promise.all([
    prisma.tag.findFirst({
      where: { id, userId: user.id },
      include: { product: true, orderItem: { select: { orderId: true } } },
    }),
    prisma.scanEvent.findMany({
      where: { tag: { id, userId: user.id } },
      orderBy: { scannedAt: "desc" },
      take: 50,
    }),
    prisma.relayMessage.findMany({
      where: { tag: { id, userId: user.id } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.theme.findMany({
      where: { status: "ACTIVE" },
      orderBy: { sortOrder: "asc" },
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
      <h1 className="text-2xl font-bold mt-2">
        {tag.internalLabel ?? tag.product?.name ?? "Tag"}
      </h1>
      <p className="text-sm text-black/50 font-mono">/t/{tag.shortCode}</p>

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
            {tag.orderItem?.orderId && (
              <Link
                href={`/dashboard/orders/${tag.orderItem.orderId}`}
                className="mt-3 text-xs text-emerald-700 hover:underline"
              >
                View originating order
              </Link>
            )}
          </div>

          <div className="mt-8">
            <h2 className="font-semibold">Scan history</h2>
            {scans.length === 0 ? (
              <p className="mt-2 text-sm text-black/50">No scans yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-black/10 rounded-lg border border-black/10">
                {scans.map((scan) => (
                  <li key={scan.id} className="p-3 text-sm flex justify-between gap-3">
                    <span>{scan.scannedAt.toLocaleString()}</span>
                    <span className="text-black/50 text-right">
                      {[scan.approxCity, scan.approxCountry].filter(Boolean).join(", ") ||
                        "Unknown location"}
                      <br />
                      <span className="text-xs">{summarizeUserAgent(scan.userAgent)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-8">
            <h2 className="font-semibold">Messages from finders</h2>
            {messages.length === 0 ? (
              <p className="mt-2 text-sm text-black/50">No messages yet.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {messages.map((m) => (
                  <li key={m.id} className="rounded-lg border border-black/10 p-3 text-sm">
                    <div className="flex items-center justify-between text-xs text-black/50">
                      <span>{m.createdAt.toLocaleString()}</span>
                    </div>
                    <p className="mt-1">{m.message}</p>
                    <p className="mt-1 text-xs text-black/50">
                      Reply to: <span className="font-medium text-black/70">{m.finderContact}</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <h2 className="font-semibold mb-3">Settings</h2>
          <TagSettingsForm
            tag={{ id: tag.id, internalLabel: tag.internalLabel, status: tag.status }}
          />

          <div className="mt-8">
            <ThemePicker
              tagId={tag.id}
              themes={themes as (ThemeSkin & { id: string })[]}
              currentThemeId={tag.themeId}
            />
          </div>
          <p className="mt-4 text-xs text-black/50">
            What finders see comes from your{" "}
            <Link href="/dashboard/profile" className="text-emerald-700 hover:underline">
              emergency profile
            </Link>{" "}
            and{" "}
            <Link href="/dashboard/privacy" className="text-emerald-700 hover:underline">
              privacy settings
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
