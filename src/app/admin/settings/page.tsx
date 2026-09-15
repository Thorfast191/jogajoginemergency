import { getStaffWith } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { availableGateways } from "@/lib/payments/registry";
import { isConfigured as mailConfigured } from "@/lib/notify";
import { Forbidden } from "@/components/admin/forbidden";
import { RunMaintenanceButton, SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  if (!(await getStaffWith("settings.manage"))) return <Forbidden />;

  const [settings, failed] = await Promise.all([
    getSettings(),
    prisma.notificationLog.findMany({
      where: { status: "FAILED" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, kind: true, toEmail: true, subject: true, error: true, createdAt: true },
    }),
  ]);
  const gateways = availableGateways().map((g) => ({ id: g.id, label: g.label }));
  const cronReady = Boolean(process.env.MAINTENANCE_SECRET?.trim());

  return (
    <div>
      <h1 className="text-2xl font-bold">Platform settings</h1>
      <p className="mt-1 text-sm text-black/60">
        Changes here are recorded in the activity log. Secrets — database, gateway credentials,
        mail server — stay in the server environment.
      </p>

      <div className="mt-6 grid gap-8 xl:grid-cols-[1fr_22rem]">
        <SettingsForm settings={settings} gateways={gateways} />

        <aside className="space-y-5">
          <section className="rounded-2xl border border-black/10 bg-white p-5">
            <h2 className="font-semibold">Health</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex justify-between gap-3">
                <span>Outgoing email</span>
                <span className={mailConfigured() ? "text-emerald-700" : "text-amber-700"}>
                  {mailConfigured() ? "Configured" : "Not configured"}
                </span>
              </li>
              <li className="flex justify-between gap-3">
                <span>Scheduled maintenance</span>
                <span className={cronReady ? "text-emerald-700" : "text-amber-700"}>
                  {cronReady ? "Endpoint enabled" : "No MAINTENANCE_SECRET"}
                </span>
              </li>
              <li className="flex justify-between gap-3">
                <span>Payment gateways</span>
                <span>{gateways.length} configured</span>
              </li>
            </ul>
            {!mailConfigured() && (
              <p className="mt-3 text-xs text-amber-800">
                Without SMTP, messages finders leave and scan alerts are recorded but never delivered.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-black/10 bg-white p-5">
            <h2 className="font-semibold">Maintenance</h2>
            <p className="mt-1 text-sm text-black/60">
              Sends subscription expiry warnings and prunes old records. Safe to run any time — it
              never sends the same warning twice in a day.
            </p>
            <div className="mt-3">
              <RunMaintenanceButton />
            </div>
          </section>

          <section className="rounded-2xl border border-black/10 bg-white p-5">
            <h2 className="font-semibold">Failed emails</h2>
            {failed.length === 0 ? (
              <p className="mt-2 text-sm text-black/50">None recently.</p>
            ) : (
              <ul className="mt-2 divide-y divide-black/10 text-xs">
                {failed.map((n) => (
                  <li key={n.id} className="py-2">
                    <p className="font-medium">{n.subject}</p>
                    <p className="text-black/50">
                      {n.kind} → {n.toEmail} · {n.createdAt.toLocaleString()}
                    </p>
                    {n.error && <p className="mt-0.5 text-red-700">{n.error}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
