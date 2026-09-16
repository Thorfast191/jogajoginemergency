"use server";

import { revalidatePath } from "next/cache";
import { getCustomer, requireCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { changeOwnPassword } from "@/lib/account";
import { firstIssue } from "@/lib/validations";

const profileSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().max(20).optional().or(z.literal("")),
});

export type ProfileState = { error?: string; success?: boolean };

export async function updateProfileAction(
  _prevState: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const authedUser = await getCustomer();
  if (!authedUser) return { error: "Not authorized." };

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  await prisma.user.update({
    where: { id: authedUser.id },
    data: { name: parsed.data.name, phone: parsed.data.phone || null },
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export type PasswordState = { error?: string; success?: boolean };

export async function updatePasswordAction(
  _prevState: PasswordState,
  formData: FormData
): Promise<PasswordState> {
  const authedUser = await getCustomer();
  if (!authedUser) return { error: "Not authorized." };

  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  // Shared with the admin profile page. Stamps passwordChangedAt, so changing
  // your password signs out every other device rather than only this one.
  const result = await changeOwnPassword(
    authedUser.id,
    parsed.data.currentPassword,
    parsed.data.newPassword,
  );
  if (!result.ok) return { error: result.error };

  return { success: true };
}

/** Turn scan emails on or off. Off is a preference, not a privacy control —
 *  scans are still recorded and shown in the dashboard either way. */
export async function setScanEmailsAction(formData: FormData): Promise<void> {
  const user = await requireCustomer();
  await prisma.user.update({
    where: { id: user.id },
    data: { notifyOnScan: formData.get("enabled") === "on" },
  });
  revalidatePath("/dashboard/settings");
}
