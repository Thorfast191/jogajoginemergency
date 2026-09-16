import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { tagUrl } from "@/lib/qr";
import { summarizeUserAgent } from "@/lib/user-agent";
import { Icon } from "@/components/icons";
import { TagSettingsForm } from "./tag-settings-form";
import { ThemePicker } from "./theme-picker";
import type { ThemeSkin } from "@/lib/themes";
import { entitledThemeIdsForUser } from "@/lib/theme-access-server";

export default async function TagDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCustomer();
  if (!user) redirect("/login");

  const [tag, scans, messages, themes, entitledThemeIds, products] = await Promise.all([
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
    entitledThemeIdsForUser(user.id),
    // What a locked theme could be bought through, so the picker can point at
    // the sticker instead of just refusing.
    prisma.product.findMany({
      where: { status: "ACTIVE", themeId: { not: null } },
      select: { slug: true, name: true, themeId: true, priceCents: true },
    }),
  ]);

  if (!tag) notFound();

  const url = tagUrl(tag.shortCode);
  const button =
    "inline-flex items-center gap-2 rounded-xl border border-black/15 px-3 py-2 text-sm font-medium hover:bg-black/5";

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
          <div className="rounded-2xl border border-black/10 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-black/40">Your sticker</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/tags/${tag.id}/sticker?size=thumb`}
              alt="Your sticker: the theme artwork with your QR code printed in the middle"
              className="mx-auto mt-3 w-full max-w-xs rounded-xl border border-black/5 anim-pop"
            />
            <p className="mt-3 break-all text-center font-mono text-xs text-black/50">{url}</p>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <a
                href={`/api/tags/${tag.id}/sticker?download=1`}
                download
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white"
              >
                <Icon name="download" />
                Sticker (PNG)
              </a>
              <a href={`/api/tags/${tag.id}/sticker?format=pdf`} download className={button}>
                <Icon name="download" />
                Sticker (PDF)
              </a>
              <a href={`/api/tags/${tag.id}/qr`} download className={button}>
                <Icon name="qr" />
                QR only
              </a>
              <a href={url} target="_blank" rel="noreferrer" className={button}>
                <Icon name="external" />
                Public page
              </a>
            </div>
            <p className="mt-3 text-center text-xs text-black/50">
              We print and ship the sticker from your order. The PDF is at its real printed size
              ({tag.product?.stickerWidthMm ?? 60} mm wide) if you ever want to reprint it.
            </p>
            {tag.orderItem?.orderId && (
              <p className="mt-2 text-center">
                <Link
                  href={`/dashboard/orders/${tag.orderItem.orderId}`}
                  className="text-xs text-[var(--color-primary-dark)] hover:underline"
                >
                  View originating order
                </Link>
              </p>
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
            tag={{
              id: tag.id,
              internalLabel: tag.internalLabel,
              status: tag.status,
              takenDown: tag.takenDownAt !== null,
            }}
          />

          <div className="mt-8">
            <ThemePicker
              tagId={tag.id}
              themes={themes as (ThemeSkin & { id: string })[]}
              currentThemeId={tag.themeId}
              entitledThemeIds={[...entitledThemeIds]}
              products={products}
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
