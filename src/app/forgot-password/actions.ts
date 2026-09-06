"use server";

import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { notifyPasswordReset } from "@/lib/notify";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";

const schema = z.object({
  email: z
    .string()
    .email()
    .transform((v) => v.trim().toLowerCase()),
});

export type ForgotPasswordState = { submitted?: boolean; error?: string };

export async function forgotPasswordAction(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: "Enter a valid email." };

  const ip = await getClientIp();
  const { allowed } = await rateLimit(`forgot-password:${ip}`, { limit: 5, windowMs: 15 * 60_000 });
  if (!allowed) return { error: "Too many attempts. Try again later." };

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  // Always report success, whether or not the account exists, so this
  // endpoint can't be used to enumerate registered emails.
  if (user) {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    await prisma.verificationToken.deleteMany({ where: { identifier: parsed.data.email } });
    await prisma.verificationToken.create({
      data: {
        identifier: parsed.data.email,
        token: hashedToken,
        expires: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    await notifyPasswordReset({
      email: parsed.data.email,
      resetUrl: `${base}/reset-password/${rawToken}`,
    });
  }

  return { submitted: true };
}
