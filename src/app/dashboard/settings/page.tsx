import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ProfileForm, PasswordForm } from "./settings-forms";
import { setScanEmailsAction } from "./actions";
import { isConfigured } from "@/lib/notify";

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
        <h2 className="font-semibold mb-3">Notifications</h2>
        <form
          action={setScanEmailsAction}
          className="flex items-center justify-between gap-4 rounded-xl border border-black/10 bg-white p-4"
        >
          <div>
            <p className="text-sm font-semibold">Email me when a tag is scanned</p>
            <p className="mt-0.5 text-sm text-black/60">
              At most one email per tag every ten minutes. Scans are recorded in your dashboard
              either way.
            </p>
            {!isConfigured() && (
              <p className="mt-1 text-xs text-amber-700">
                No mail server is configured on this deployment yet, so nothing is sent.
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <input
              id="enabled"
              name="enabled"
              type="checkbox"
              defaultChecked={user.notifyOnScan}
              className="h-4 w-4"
            />
            <label htmlFor="enabled" className="sr-only">
              Email me when a tag is scanned
            </label>
            <button
              type="submit"
              className="rounded-lg border border-black/15 px-3 py-1.5 text-sm font-medium hover:bg-black/5"
            >
              Save
            </button>
          </div>
        </form>
      </div>

      <div className="mt-10">
        <h2 className="font-semibold mb-3">Password</h2>
        <PasswordForm />
      </div>
    </div>
  );
}
