import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ProfileForm, PasswordForm } from "./settings-forms";

export default async function SettingsPage() {
  const authed = await getCustomer();
  if (!authed) redirect("/login");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: authed.id } });

  return (
    <div>
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="mt-6">
        <h2 className="font-semibold mb-3">Profile</h2>
        <ProfileForm name={user.name} phone={user.phone ?? ""} />
      </div>

      <div className="mt-10">
        <h2 className="font-semibold mb-3">Password</h2>
        <PasswordForm />
      </div>
    </div>
  );
}
