"use server";

import { signOut } from "@/lib/auth";

// Shared by both the customer dashboard and the admin panel. Kept in its own
// module so neither application area has to import from the other.
export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
