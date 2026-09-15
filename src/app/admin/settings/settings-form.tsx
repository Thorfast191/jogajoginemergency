"use client";

import { useActionState, useState, useTransition } from "react";
import type { PlatformSettings } from "@/lib/settings";
import type { MaintenanceResult } from "@/lib/maintenance";
import { runMaintenanceAction, saveSettingsAction, type SettingsState } from "./actions";

const initial: SettingsState = {};
const field = "mt-1 w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm";

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-5">
      <h2 className="font-semibold">{title}</h2>
      {hint && <p className="mt-1 text-sm text-black/60">{hint}</p>}
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

export function SettingsForm({
  settings,
  gateways,
}: {
  settings: PlatformSettings;
  gateways: { id: string; label: string }[];
}) {
  const [state, action, pending] = useActionState(saveSettingsAction, initial);
  const [paused, setPaused] = useState(settings.ordersPaused);

  return (
    <form action={action} className="space-y-5">
      <Section title="Contact details" hint="Shown in the site footer and on the Contact page.">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Support email
            <input name="supportEmail" type="email" defaultValue={settings.supportEmail ?? ""} className={field} />
          </label>
          <label className="text-sm">
            Support phone
            <input name="supportPhone" defaultValue={settings.supportPhone ?? ""} className={field} />
          </label>
        </div>
        <label className="block text-sm">
          Address
          <input name="address" defaultValue={settings.address ?? ""} className={field} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Facebook page
            <input name="facebookUrl" type="url" placeholder="https://facebook.com/…" defaultValue={settings.facebookUrl ?? ""} className={field} />
          </label>
          <label className="text-sm">
            WhatsApp link
            <input name="whatsappUrl" type="url" placeholder="https://wa.me/880…" defaultValue={settings.whatsappUrl ?? ""} className={field} />
          </label>
        </div>
      </Section>

      <Section title="Announcement" hint="A short line across the top of every public page. Leave empty for none.">
        <input name="announcement" maxLength={200} defaultValue={settings.announcement ?? ""} className={field} placeholder="Free shipping in Dhaka this week" />
      </Section>

      <Section title="Orders" hint="Pause new checkouts for a stock-out or a holiday. Carts are kept, and paid orders are unaffected.">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="ordersPaused"
            checked={paused}
            onChange={(e) => setPaused(e.target.checked)}
            className="h-4 w-4"
          />
          Pause new orders
        </label>
        {paused && (
          <label className="block text-sm">
            Message customers see
            <input
              name="ordersPausedMessage"
              maxLength={200}
              defaultValue={settings.ordersPausedMessage ?? ""}
              placeholder="We're restocking — back on Sunday!"
              className={field}
            />
          </label>
        )}
        {!paused && <input type="hidden" name="ordersPausedMessage" value={settings.ordersPausedMessage ?? ""} />}
      </Section>

      <Section
        title="Payment methods"
        hint="Gateways configured on this server. Untick one to stop offering it; payments already in progress still settle. Credentials are set in the environment, not here."
      >
        {gateways.length === 0 ? (
          <p className="text-sm text-amber-800">No payment gateway is configured on this server.</p>
        ) : (
          <div className="flex flex-wrap gap-4">
            {gateways.map((g) => (
              <label key={g.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="offerGateway"
                  value={g.id}
                  defaultChecked={!settings.disabledGateways.includes(g.id)}
                  className="h-4 w-4"
                />
                {g.label}
              </label>
            ))}
          </div>
        )}
      </Section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[var(--color-primary)] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save settings"}
        </button>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.success && <p className="text-sm text-[var(--color-primary-dark)]">Saved.</p>}
      </div>
    </form>
  );
}

export function RunMaintenanceButton() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<MaintenanceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await runMaintenanceAction();
            if (res.error) setError(res.error);
            else setResult(res.result ?? null);
          })
        }
        disabled={pending}
        className="rounded-lg border border-black/15 bg-white px-4 py-2 text-sm font-medium hover:bg-black/5 disabled:opacity-60"
      >
        {pending ? "Running…" : "Run maintenance now"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {result && (
        <p className="mt-2 text-sm text-black/70">
          Sent {result.notified} expiry warning{result.notified === 1 ? "" : "s"}, pruned{" "}
          {result.prunedCounters} rate-limit counters and {result.prunedNotifications} old
          notifications.
        </p>
      )}
    </div>
  );
}
