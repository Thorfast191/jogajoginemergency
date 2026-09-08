import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/session";
import { AdminIdentityForm, AdminPasswordForm } from "./profile-forms";

export const dynamic = "force-dynamic";

export default async function AdminProfilePage() {
  const admin = await getAdmin();
  if (!admin) redirect("/dashboard");

  return (
    <div>
      <h1 className="text-2xl font-bold">My profile</h1>
      <p className="mt-1 text-sm text-black/50">
        Your own admin account. Managing other people is under Users and Admins.
      </p>

      <section className="mt-8">
        <h2 className="text-xs font-medium uppercase tracking-wide text-black/40">Identity</h2>
        <div className="mt-3">
          <AdminIdentityForm name={admin.name} email={admin.email} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xs font-medium uppercase tracking-wide text-black/40">Password</h2>
        <div className="mt-3">
          <AdminPasswordForm />
        </div>
      </section>
    </div>
  );
}
