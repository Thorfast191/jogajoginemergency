import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { buildPublicProfileView } from "@/lib/public-profile";
import { userIsEntitled } from "@/lib/subscription";
import { PortfolioVisibility } from "./portfolio-visibility";
import { FLAG_NAMES, type VisibilityFlags } from "@/lib/privacy";
import { PublicProfileCard } from "@/components/public-profile-card";
import { ensureProfile } from "@/app/dashboard/profile/actions";
import { PrivacyControls } from "./privacy-controls";

export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const user = await getCustomer();
  if (!user) redirect("/login");

  await ensureProfile(user.id);
  const profile = await prisma.emergencyProfile.findUniqueOrThrow({
    where: { userId: user.id },
    include: {
      contacts: { orderBy: { sortOrder: "asc" } },
      links: { orderBy: { sortOrder: "asc" } },
    },
  });

  const flags = Object.fromEntries(
    FLAG_NAMES.map((k) => [k, profile[k]]),
  ) as unknown as VisibilityFlags;

  // The preview must show what a finder would really see, so it runs through
  // the same DTO with the account's real entitlement rather than assuming paid.
  const entitled = await userIsEntitled(user.id);
  const view = buildPublicProfileView(profile, profile.contacts, profile.links, {
    lost: false,
    entitled,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Privacy</h1>
      <p className="mt-1 text-sm text-black/60">
        Choose exactly what a finder sees when they scan your tag. Edit the content itself in{" "}
        <Link href="/dashboard/profile" className="text-emerald-700 hover:underline">
          My Profile
        </Link>
        .
      </p>

      <div className="mt-6 grid lg:grid-cols-2 gap-8">
        <div>
          <PrivacyControls flags={flags} preset={profile.visibilityPreset} />
          <PortfolioVisibility
            bioPublic={profile.bioPublic}
            linksPublic={profile.linksPublic}
            entitled={entitled}
          />
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-black/40 mb-2">
            What finders see
          </p>
          <div className="rounded-xl border border-black/10 bg-white p-6 max-w-sm">
            <p className="text-center text-xs font-medium text-emerald-600 mb-4">
              JOGAJOG EMERGENCY
            </p>
            <PublicProfileCard view={view} shortCode="preview" />
          </div>
        </div>
      </div>
    </div>
  );
}
