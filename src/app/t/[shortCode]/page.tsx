import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/client-ip";
import { hashIp } from "@/lib/hash";
import { rateLimit } from "@/lib/rate-limit";
import { approxLocationFrom, formatLocation } from "@/lib/geo";
import { notifyOwnerOfScan } from "@/lib/notify";
import { buildPublicProfileView } from "@/lib/public-profile";
import { resolveScanTheme, type ThemeSkin } from "@/lib/themes";
import { userIsEntitled } from "@/lib/subscription";
import { PublicProfileCard } from "@/components/public-profile-card";
import { ScanLayout } from "@/components/scan-layout";
import { ThemeMascot } from "@/components/illustrations";
import { ReportAbuseLink } from "./report-abuse-link";

export const dynamic = "force-dynamic";

// A scan page can carry someone's blood group, allergies and next of kin. It
// is public because a stranger holding a found helmet has to reach it without
// an account — but public is not the same as crawlable, and an emergency
// profile indexed by a search engine is a privacy failure, not a feature.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function ScanPage({ params }: { params: Promise<{ shortCode: string }> }) {
  const { shortCode } = await params;

  const tag = await prisma.tag.findUnique({
    where: { shortCode },
    include: {
      theme: true,
      product: { select: { name: true } },
      user: {
        include: {
          emergencyProfile: {
            include: {
              contacts: { orderBy: { sortOrder: "asc" } },
              links: { orderBy: { sortOrder: "asc" } },
            },
          },
        },
      },
    },
  });

  if (!tag || tag.status === "DEACTIVATED") {
    notFound();
  }

  // Scan logging — hashed IP only, rate-limited. Logged even for a dormant
  // page: the owner should see that people are scanning, since that is the
  // strongest reason to renew.
  //
  // It runs after the response is sent. Someone standing over an injured
  // rider must not wait on a database write and an SMTP round trip before the
  // blood group appears. Request headers can't be read inside `after` from a
  // page, so everything it needs is captured here first.
  const ip = await getClientIp();
  const h = await headers();
  const userAgent = h.get("user-agent")?.slice(0, 300);
  const location = approxLocationFrom(h);
  const owner = { id: tag.userId, email: tag.user.email, notify: tag.user.notifyOnScan };
  const tagLabel = tag.internalLabel ?? tag.product?.name ?? `/t/${shortCode}`;
  // A scalar, not `tag`: the callback below outlives the response, and closing
  // over the tag would hold this person's medical notes and next of kin in
  // memory until the database write and the email have finished.
  const tagId = tag.id;

  after(async () => {
    try {
      const { allowed } = await rateLimit(`scan:${ip}`, { limit: 30, windowMs: 60_000 });
      if (!allowed) return;

      const scannedAt = new Date();
      await prisma.scanEvent.create({
        data: { tagId, ipHash: hashIp(ip), userAgent, scannedAt, ...location },
      });

      // Tell the owner — but at most once every ten minutes per tag, so
      // someone refreshing the page does not fill an inbox.
      const notifiable = await rateLimit(`scan-notify:${tagId}`, {
        limit: 1,
        windowMs: 10 * 60_000,
      });
      if (notifiable.allowed && owner.notify) {
        await notifyOwnerOfScan({
          userId: owner.id,
          ownerEmail: owner.email,
          tagId,
          tagLabel,
          scannedAt,
          approxLocation: formatLocation(location),
        });
      }
    } catch (e) {
      console.error("[scan] logging failed:", e);
    }
  });

  const skin = resolveScanTheme(tag.theme as ThemeSkin | null);
  const entitled = await userIsEntitled(tag.userId);
  const profile = tag.user.emergencyProfile;

  // An entitled owner who has not filled anything in yet gets a friendly
  // holding page rather than an empty card.
  if (entitled && !profile) {
    return (
      <ScanLayout skin={skin}>
        <div className="text-center">
          <ThemeMascot
            mascot={skin.mascot}
            className="mx-auto h-20 w-20 text-[var(--skin-accent)] anim-float"
          />
          <h1 className="mt-3 text-xl font-semibold">This tag isn&apos;t set up yet</h1>
          <p className="mt-2 text-sm text-[var(--skin-muted)]">
            Its owner hasn&apos;t added their emergency information yet. If you found an item with
            this sticker, please hold onto it — they&apos;ll likely fill it in soon.
          </p>
        </div>
      </ScanLayout>
    );
  }

  const view = buildPublicProfileView(
    profile ?? EMPTY_PROFILE,
    profile?.contacts ?? [],
    profile?.links ?? [],
    { lost: tag.status === "LOST", entitled },
  );

  return (
    <ScanLayout skin={skin}>
      <PublicProfileCard view={view} shortCode={shortCode} mascot={skin.mascot} />
      <div className="mt-2 text-center">
        <ReportAbuseLink shortCode={shortCode} />
      </div>
    </ScanLayout>
  );
}

// A tag whose owner never created a profile still renders — as a dormant page,
// which is the same thing a lapsed subscription produces.
const EMPTY_PROFILE = {
  displayName: null,
  photoAssetId: null,
  bloodGroup: null,
  allergies: null,
  medicalNotes: null,
  emergencyMessage: null,
  bio: null,
  contactMode: "RELAY" as const,
  phonePublic: null,
  photoPublic: false,
  namePublic: false,
  messagePublic: false,
  bloodGroupPublic: false,
  allergiesPublic: false,
  medicalNotesPublic: false,
  contactsPublic: false,
  showPhone: false,
  bioPublic: false,
  linksPublic: false,
};

