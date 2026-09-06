"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type ResetPasswordState = { error?: string; success?: boolean };

export async function resetPasswordAction(
  rawToken: string,
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const parsed = schema.safeParse({ password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

  const record = await prisma.verificationToken.findUnique({ where: { token: hashedToken } });
  if (!record || record.expires < new Date()) {
    return { error: "This reset link is invalid or has expired. Request a new one." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  // Stamping this invalidates every session issued before now — the usual
  // reason to reset a password is that someone else may hold one.
  await prisma.user.update({
    where: { email: record.identifier },
    data: { passwordHash, passwordChangedAt: new Date() },
  });

  await prisma.verificationToken.delete({ where: { token: hashedToken } });

  return { success: true };
}
