import { headers } from "next/headers";
import { appUrl } from "@/lib/payments/config";
import { appUrlMismatch } from "@/lib/env";

/**
 * Warn when this app is being served from an origin other than the one QR
 * codes and payment callbacks are addressed to.
 *
 * Called before handing a customer to a gateway, because that is the moment a
 * wrong NEXT_PUBLIC_APP_URL becomes expensive: the callback goes to whatever
 * is listening at the configured origin, and if that is not this app, the
 * payment is taken and never settled — with nothing logged anywhere.
 */
export async function warnOnOriginMismatch(context: string): Promise<void> {
  const host = (await headers()).get("host");
  const warning = appUrlMismatch(host, appUrl());
  if (warning) console.warn(`[origin] ${context}: ${warning}`);
}
