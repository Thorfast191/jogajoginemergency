import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ensureProfile } from "@/lib/profile";
import { ProfileForm } from "./profile-form";
import { ContactsEditor } from "./contacts-editor";
import { PortfolioEditor } from "./portfolio-editor";
import { userIsEntitled } from "@/lib/subscription";
import { PhotoControls } from "./photo-controls";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCustomer();
  if (!user) redirect("/login");

  await ensureProfile(user.id);
  const entitled = await userIsEntitled(user.id);
  const profile = await prisma.emergencyProfile.findUniqueOrThrow({
    where: { userId: user.id },
    include: {
      contacts: { orderBy: { sortOrder: "asc" } },
      links: { orderBy: { sortOrder: "asc" } },
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">My Profile</h1>
      <p className="mt-1 text-sm text-black/60">
        This is what a finder can see when they scan one of your tags. You choose which parts are
        public in{" "}
        <Link href="/dashboard/privacy" className="text-emerald-700 hover:underline">
          Privacy
        </Link>
        .
      </p>

      <div className="mt-8">
        <h2 className="font-semibold mb-3">Photo</h2>
        <PhotoControls photoAssetId={profile.photoAssetId} />
      </div>

      <div className="mt-8">
        <ProfileForm
          profile={{
            displayName: profile.displayName,
            emergencyMessage: profile.emergencyMessage,
            bloodGroup: profile.bloodGroup,
            allergies: profile.allergies,
            medicalNotes: profile.medicalNotes,
            contactMode: profile.contactMode,
            phonePublic: profile.phonePublic,
          }}
          accountName={user.name}
        />
      </div>

      <div className="mt-10 max-w-lg">
        <h2 className="font-semibold">Emergency contacts</h2>
        <p className="mt-1 mb-3 text-sm text-black/60">
          People a finder can reach on your behalf. Up to five.
        </p>
        <ContactsEditor
          contacts={profile.contacts.map((c) => ({
            id: c.id,
            name: c.name,
            relation: c.relation,
            phone: c.phone,
            email: c.email,
            isPublic: c.isPublic,
          }))}
        />
      </div>

      <div className="mt-10 max-w-lg">
        <h2 className="font-semibold">Portfolio</h2>
        <p className="mt-1 mb-3 text-sm text-black/60">
          The optional half of your scan page — a line about you and where to find you.
        </p>
        <PortfolioEditor
          bio={profile.bio}
          links={profile.links.map((l) => ({
            id: l.id,
            label: l.label,
            url: l.url,
            isPublic: l.isPublic,
          }))}
          entitled={entitled}
        />
      </div>
    </div>
  );
}
