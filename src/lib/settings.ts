import { cache } from "react";
import { prisma } from "@/lib/prisma";

// Platform settings a super admin edits at /admin/settings. One row, read many
// times per request (nav, footer, the page itself), so it is deduplicated per
// request with React's cache. Secrets never live here: gateway credentials stay
// in the environment, and disabledGateways can only hide what is configured.

export type PlatformSettings = {
  supportEmail: string | null;
  supportPhone: string | null;
  address: string | null;
  facebookUrl: string | null;
  whatsappUrl: string | null;
  announcement: string | null;
  ordersPaused: boolean;
  ordersPausedMessage: string | null;
  disabledGateways: string[];
};

export const SETTINGS_ID = "default";

export const DEFAULT_SETTINGS: PlatformSettings = {
  supportEmail: null,
  supportPhone: null,
  address: null,
  facebookUrl: null,
  whatsappUrl: null,
  announcement: null,
  ordersPaused: false,
  ordersPausedMessage: null,
  disabledGateways: [],
};

/**
 * The current settings, or the defaults if none were ever saved. A database
 * hiccup also yields the defaults: a footer must not take the scan page or the
 * shop down with it.
 */
export const getSettings = cache(async (): Promise<PlatformSettings> => {
  const row = await prisma.platformSetting
    .findUnique({ where: { id: SETTINGS_ID } })
    .catch(() => null);
  if (!row) return DEFAULT_SETTINGS;

  return {
    supportEmail: row.supportEmail,
    supportPhone: row.supportPhone,
    address: row.address,
    facebookUrl: row.facebookUrl,
    whatsappUrl: row.whatsappUrl,
    announcement: row.announcement,
    ordersPaused: row.ordersPaused,
    ordersPausedMessage: row.ordersPausedMessage,
    disabledGateways: row.disabledGateways,
  };
});
