"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations";
import { isSafeNext } from "@/lib/nav";
import { isStaff } from "@/lib/permissions";
import { LoginThrottled } from "@/lib/login-throttle";

// Failed attempts are counted and limited inside the credentials check
// (src/lib/login-throttle.ts), which Auth.js's own endpoint also goes through.

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

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (err) {
    // Auth.js rewraps what `authorize` threw, so match the code, not the class.
    if (err instanceof AuthError) {
      const code = (err as { code?: string }).code;
      return { error: code === new LoginThrottled().code ? THROTTLED : BAD_CREDENTIALS };
    }
    throw err;
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { role: true },
  });

  if (isStaff(user?.role)) {
    redirect("/admin");
  }

  const nextRaw = formData.get("next");
  const next = typeof nextRaw === "string" && isSafeNext(nextRaw) ? nextRaw : "/dashboard";
  redirect(next);
}
