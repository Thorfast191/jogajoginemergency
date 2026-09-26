"use server";

import { signOut } from "@/lib/auth";
import { handoff, publicHref } from "@/lib/hosts";

// Shared by both the customer dashboard and the admin panel. Kept in its own
// module so neither application area has to import from the other.
export async function signOutAction() {
  // The public site, not the host they signed out of: the console and the
  // client area have nothing to show a signed-out visitor.
  await signOut({ redirectTo: handoff(publicHref("/")) });
}
