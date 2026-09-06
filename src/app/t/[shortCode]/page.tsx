import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/client-ip";
import { hashIp } from "@/lib/hash";
import { rateLimit } from "@/lib/rate-limit";
import { buildPublicProfileView } from "@/lib/public-profile";
import { resolveScanTheme, themeCssVars, type ThemeSkin } from "@/lib/themes";
import { userIsEntitled } from "@/lib/subscription";
import { PublicProfileCard } from "@/components/public-profile-card";
import { ThemeMascot } from "@/components/illustrations";
import { ReportAbuseLink } from "./report-abuse-link";

export const dynamic = "force-dynamic";

export default async function ScanPage({ params }: { params: Promise<{ shortCode: string }> }) {
  const { shortCode } = await params;

  const tag = await prisma.tag.findUnique({
    where: { shortCode },
    include: {
      theme: true,
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

function ScanLayout({ children, skin }: { children: React.ReactNode; skin: ThemeSkin }) {
  return (
    <div
      style={themeCssVars(skin) as React.CSSProperties}
      className="flex min-h-screen items-center justify-center bg-[var(--skin-bg)] px-4 py-10 text-[var(--skin-ink)]"
    >
      <div className="w-full max-w-sm">
        <p className="mb-4 text-center text-xs font-semibold tracking-wide text-[var(--skin-accent)]">
          JOGAJOG EMERGENCY
        </p>
        <div className="rounded-2xl border border-[var(--skin-line)] bg-[var(--skin-surface)] p-6 shadow-sm">
          {children}
        </div>
        <p className="mt-4 text-center text-[11px] text-[var(--skin-muted)]">
          <Link href="/" className="hover:underline">
            What is Jogajog Emergency?
          </Link>
        </p>
      </div>
    </div>
  );
}
