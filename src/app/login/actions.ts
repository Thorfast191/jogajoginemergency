"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations";
import { isSafeNext } from "@/lib/nav";
import { adminHref, areaForPath, clientHref, hrefIn } from "@/lib/hosts";
import { isStaff } from "@/lib/permissions";
import { LoginThrottled } from "@/lib/login-throttle";

// Failed attempts are counted and limited inside the credentials check
// (src/lib/login-throttle.ts), which Auth.js's own endpoint also goes through.

const THROTTLED = "Too many failed attempts. Please try again in a few minutes.";
const BAD_CREDENTIALS = "Invalid email or password.";

/**
 * `go` is a destination on another one of our hostnames.
 *
 * A Server Action's redirect is resolved by the client router, which cannot
 * move the address bar to a different origin: the customer stayed on /login
 * while the dashboard was fetched underneath them. So a hop that leaves this
 * host is handed back to the form, which performs a real navigation. Within one
 * host — every single-host install — the action still redirects normally, and
 * the form never sees `go` at all.
 */
export type LoginState = { error?: string; go?: string };

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

  // Staff always go to the console's host; a `?next=` they arrived with was a
  // path on whichever host bounced them, and the console is not that host.
  const nextRaw = formData.get("next");
  const target = isStaff(user?.role)
    ? adminHref("/admin")
    : typeof nextRaw === "string" && isSafeNext(nextRaw)
      ? // `isSafeNext` has already refused anything but a same-origin path;
        // this puts it on the host that actually serves it.
        hrefIn(areaForPath(nextRaw), nextRaw)
      : clientHref("/dashboard");

  if (target.startsWith("http")) return { go: target };
  redirect(target);
}
