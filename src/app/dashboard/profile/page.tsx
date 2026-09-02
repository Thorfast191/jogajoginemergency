import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ensureProfile } from "./actions";
import { ProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCustomer();
  if (!user) redirect("/login");

  await ensureProfile(user.id);
  const profile = await prisma.emergencyProfile.findUniqueOrThrow({
    where: { userId: user.id },
    include: { contacts: { orderBy: { sortOrder: "asc" } } },
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
    </div>
  );
}
