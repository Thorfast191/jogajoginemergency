"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations";
import { isSafeNext } from "@/lib/nav";
import { checkLimit, recordHit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";

// Throttling is deliberately failure-only: a correct password costs a user
// nothing. The per-email bucket is the real defence (it follows the account an
// attacker is actually targeting); the per-IP bucket is a looser net for
// spraying across many accounts. It is loose on purpose — mobile carriers here
// NAT heavily, so a tight per-IP limit would lock out unrelated real users
// sharing one egress address.
const EMAIL_LIMIT = { limit: 5, windowMs: 15 * 60_000 };
const IP_LIMIT = { limit: 30, windowMs: 15 * 60_000 };

const THROTTLED = "Too many failed attempts. Please try again in a few minutes.";
const BAD_CREDENTIALS = "Invalid email or password.";

export type LoginState = { error?: string };

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Enter a valid email and password." };
  }

  const emailKey = `login-email:${parsed.data.email}`;
  const ipKey = `login-ip:${await getClientIp()}`;

  if (!checkLimit(emailKey, EMAIL_LIMIT).allowed || !checkLimit(ipKey, IP_LIMIT).allowed) {
    return { error: THROTTLED };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      recordHit(emailKey, EMAIL_LIMIT);
      recordHit(ipKey, IP_LIMIT);
      return { error: BAD_CREDENTIALS };
    }
    throw err;
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { role: true },
  });

  if (user?.role === "ADMIN") {
    redirect("/admin");
  }

  const nextRaw = formData.get("next");
  const next = typeof nextRaw === "string" && isSafeNext(nextRaw) ? nextRaw : "/dashboard";
  redirect(next);
}
