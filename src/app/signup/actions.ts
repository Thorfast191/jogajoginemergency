"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { signupSchema, firstIssue } from "@/lib/validations";
import { isSafeNext } from "@/lib/nav";
import { areaForPath, hrefIn } from "@/lib/hosts";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { recordHit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";

// Every attempt costs here, successful or not: this caps both bulk account
// creation and the rate at which the "already exists" reply below can be used
// to probe for registered addresses. That reply is kept because removing it
// needs an email-verification round-trip, and src/lib/notify.ts is still a
// console stub — revisit once real email is wired.
const SIGNUP_LIMIT = { limit: 5, windowMs: 60 * 60_000 };

/**
 * `go` is a destination on another one of our hostnames — the client area is
 * its own host. A Server Action cannot redirect across origins (the client
 * router resolves it and cannot move the address bar), so the form navigates.
 * Same reasoning, and the same shape, as LoginState.
 */
export type SignupState = { error?: string; go?: string };

export async function signupAction(
  _prevState: SignupState,
  formData: FormData
): Promise<SignupState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: firstIssue(parsed.error) };
  }

  const ip = await getClientIp();
  if (!(await recordHit(`signup:${ip}`, SIGNUP_LIMIT)).allowed) {
    return { error: "Too many sign-ups from this connection. Please try again later." };
  }

  const { name, email, phone, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: { name, email, phone: phone || null, passwordHash },
  });

  const nextRaw = formData.get("next");
  const nextPath = typeof nextRaw === "string" && isSafeNext(nextRaw) ? nextRaw : "/dashboard";
  // A new account is always a customer, and the client area is its own host.
  const next = hrefIn(areaForPath(nextPath), nextPath);

  // The account exists either way. If signing in is refused — this connection
  // is throttled for failed logins — send them to log in rather than to an
  // error page that suggests the sign-up failed.
  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (err) {
    if (err instanceof AuthError) {
      redirect(`/login?next=${encodeURIComponent(nextPath)}`);
    }
    throw err;
  }

  if (next.startsWith("http")) return { go: next };
  redirect(next);
}
