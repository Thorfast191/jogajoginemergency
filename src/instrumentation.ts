import { assertEnv } from "@/lib/env";

/**
 * Runs once when a server instance starts, before it handles any request.
 *
 * Environment validation belongs here: a production deployment missing
 * AUTH_SECRET or pointing NEXT_PUBLIC_APP_URL at the wrong origin should fail
 * to boot, rather than serve traffic and fail quietly at someone's checkout.
 */
export function register() {
  // The edge runtime has no access to most of this, and validating twice would
  // double every warning.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  assertEnv();
}
