"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdmin } from "@/lib/session";
import { changeOwnIdentity, changeOwnPassword } from "@/lib/account";

export type AdminProfileState = { error?: string; success?: boolean };

const identitySchema = z.object({
  name: z.string().min(2).max(100),
  email: z.email("Enter a valid email address."),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Use at least 8 characters."),
});

/** An admin edits their own name and sign-in email. */
export async function updateAdminIdentityAction(
  _prev: AdminProfileState,
  formData: FormData,
): Promise<AdminProfileState> {
  const admin = await getAdmin();
  if (!admin) return { error: "Not authorized." };

  const parsed = identitySchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const result = await changeOwnIdentity(admin.id, parsed.data.name, parsed.data.email);
  if (!result.ok) return { error: result.error };

  revalidatePath("/admin/profile");
  revalidatePath("/admin/admins");
  return { success: true };
}

/**
 * An admin changes their own password.
 *
 * This is the route off the seeded credentials, which is why it exists: before
 * it, the only admin account could not be re-secured outside the database.
 */
export async function updateAdminPasswordAction(
  _prev: AdminProfileState,
  formData: FormData,
): Promise<AdminProfileState> {
  const admin = await getAdmin();
  if (!admin) return { error: "Not authorized." };

  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const result = await changeOwnPassword(
    admin.id,
    parsed.data.currentPassword,
    parsed.data.newPassword,
  );
  if (!result.ok) return { error: result.error };

  return { success: true };
}
