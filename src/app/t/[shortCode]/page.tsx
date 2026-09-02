import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/client-ip";
import { hashIp } from "@/lib/hash";
import { rateLimit } from "@/lib/rate-limit";
import { RelayForm } from "./relay-form";
import { ReportAbuseLink } from "./report-abuse-link";

export const dynamic = "force-dynamic";

export default async function ScanPage({ params }: { params: Promise<{ shortCode: string }> }) {
  const { shortCode } = await params;

  const tag = await prisma.tag.findUnique({
    where: { shortCode },
    include: { item: true, user: { select: { name: true } } },
  });

  if (!tag || tag.status === "DEACTIVATED") {
    notFound();
  }

  const ip = await getClientIp();
  const { allowed } = rateLimit(`scan:${ip}`, { limit: 30, windowMs: 60_000 });

  if (allowed) {
    const h = await headers();
    await prisma.scanEvent.create({
      data: {
        tagId: tag.id,
        ipHash: hashIp(ip),
        userAgent: h.get("user-agent")?.slice(0, 300),
      },
    });
  }

  if (tag.status === "UNASSIGNED") {
    return (
      <ScanLayout>
        <div className="text-center">
          <h1 className="text-xl font-semibold">This tag hasn&apos;t been set up yet</h1>
          <p className="mt-2 text-sm text-black/60">
            Its owner hasn&apos;t configured a contact page for it. If you found an item with this
            sticker, please hold onto it — the owner will likely activate it soon.
          </p>
        </div>
      </ScanLayout>
    );
  }

  const displayName =
    tag.publicDisplayName || tag.item?.label || (tag.user ? `${tag.user.name}'s item` : "A found item");

  return (
    <ScanLayout>
      {tag.status === "LOST" && (
        <div className="mb-4 rounded-md bg-amber-100 text-amber-800 text-sm px-3 py-2 text-center font-medium">
          The owner has marked this item as lost — thank you for helping return it!
        </div>
      )}

      <div className="text-center">
        {tag.item?.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={tag.item.photoUrl}
            alt={tag.item.label}
            className="w-full max-w-xs mx-auto rounded-lg object-cover aspect-square mb-4"
          />
        )}
        <h1 className="text-xl font-semibold">{displayName}</h1>
        {tag.publicMessage && <p className="mt-2 text-sm text-black/70">{tag.publicMessage}</p>}
      </div>

      <div className="mt-8">
        {tag.contactMode === "MASKED_PHONE" && tag.maskedPhone ? (
          <a
            href={`tel:${tag.maskedPhone}`}
            className="block w-full rounded-md bg-emerald-600 text-white text-center px-4 py-3 font-medium hover:bg-emerald-700"
          >
            Call to return this item
          </a>
        ) : (
          <RelayForm shortCode={shortCode} />
        )}
      </div>

      <p className="mt-6 text-center text-xs text-black/40">
        The owner&apos;s phone number and email are never shown here.
      </p>
      <div className="mt-2 text-center">
        <ReportAbuseLink shortCode={shortCode} />
      </div>
    </ScanLayout>
  );
}

function ScanLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black/[0.02] px-4 py-10">
      <div className="w-full max-w-sm">
        <p className="text-center text-xs font-medium text-emerald-600 mb-4">JOGAJOG EMERGENCY</p>
        <div className="rounded-xl border border-black/10 bg-white p-6">{children}</div>
      </div>
    </div>
  );
}
