"use server";

import { revalidatePath } from "next/cache";
import { getStaffWith } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { settingsSchema, firstIssue } from "@/lib/validations";
import { getSettings, SETTINGS_ID, type PlatformSettings } from "@/lib/settings";
import { availableGateways } from "@/lib/payments/registry";
import { runMaintenance, type MaintenanceResult } from "@/lib/maintenance";
import { audit } from "@/lib/audit";

export type SettingsState = { error?: string; success?: boolean };

const LABELS: Record<keyof PlatformSettings, string> = {
  supportEmail: "support email",
  supportPhone: "support phone",
  address: "address",
  facebookUrl: "Facebook link",
  whatsappUrl: "WhatsApp link",
  announcement: "announcement",
  ordersPaused: "orders paused",
  ordersPausedMessage: "paused message",
  disabledGateways: "payment methods",
};

export async function saveSettingsAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const actor = await getStaffWith("settings.manage");
  if (!actor) return { error: "Only a super admin can change platform settings." };

  const parsed = settingsSchema.safeParse({
    supportEmail: formData.get("supportEmail"),
    supportPhone: formData.get("supportPhone"),
    address: formData.get("address"),
    facebookUrl: formData.get("facebookUrl"),
    whatsappUrl: formData.get("whatsappUrl"),
    announcement: formData.get("announcement"),
    ordersPaused: formData.get("ordersPaused") ?? undefined,
    ordersPausedMessage: formData.get("ordersPausedMessage"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  // The form lists the gateways this deployment has configured and ticks the
  // ones to offer. Only the unticked ones are stored — the setting can hide a
  // configured gateway, never switch on one without credentials.
  const offered = new Set(formData.getAll("offerGateway").map(String));
  const disabledGateways = availableGateways()
    .map((g) => g.id)
    .filter((id) => !offered.has(id));

  const before = await getSettings();
  const next: PlatformSettings = { ...parsed.data, disabledGateways };

  await prisma.platformSetting.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...next },
    update: next,
  });

  const changed = (Object.keys(LABELS) as (keyof PlatformSettings)[]).filter(
    (k) => JSON.stringify(before[k]) !== JSON.stringify(next[k]),
  );
  if (changed.length > 0) {
    await audit(
      actor.id,
      "settings.update",
      { type: "settings", id: SETTINGS_ID },
      `Updated platform settings: ${changed.map((k) => LABELS[k]).join(", ")}`,
    );
  }

  // The footer, nav banner, cart and checkout all read these.
  revalidatePath("/", "layout");
  return { success: true };
}

export async function runMaintenanceAction(): Promise<{ error?: string; result?: MaintenanceResult }> {
  const actor = await getStaffWith("settings.manage");
  if (!actor) return { error: "Only a super admin can run maintenance." };

  const result = await runMaintenance();
  await audit(
    actor.id,
    "maintenance.run",
    { type: "settings", id: SETTINGS_ID },
    `Ran maintenance: ${result.notified} expiry warnings sent, ${result.prunedCounters} rate-limit counters and ${result.prunedNotifications} old notifications pruned`,
  );
  return { result };
}
