import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/client-ip";
import { LoginThrottled, loginAllowed, recordFailedLogin } from "@/lib/login-throttle";
import { sessionCookieDomain } from "@/lib/cookie-domain";

// One sign-in across three hostnames.
//
// The public site, the client area and the console are separate hosts (see
// src/lib/hosts.ts), so the session cookie has to be issued for the parent
// domain or signing in on one would not be seen by the others.
//
// The catch is the `__Host-` prefix Auth.js uses for its CSRF cookie by
// default: browsers reject a `__Host-` cookie that carries a Domain attribute
// at all, so a cookie named that way simply never gets stored and every
// sign-in fails with a CSRF error. Naming it `__Secure-` keeps the protections
// that still apply — Secure, and https-only — and drops the one that cannot.
const cookieDomain = sessionCookieDomain();
const secure = (process.env.NEXT_PUBLIC_APP_URL ?? "").startsWith("https://");
const prefix = secure ? "__Secure-" : "";
const shared = {
  domain: cookieDomain ?? undefined,
  path: "/",
  sameSite: "lax",
  secure,
} as const;

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  // Left to Auth.js entirely when the app is on one host, which is every dev
  // machine: the defaults are stricter than this, and there is nothing to share.
  ...(cookieDomain
    ? {
        cookies: {
          sessionToken: {
            name: `${prefix}authjs.session-token`,
            options: { ...shared, httpOnly: true },
          },
          csrfToken: {
            name: `${prefix}authjs.csrf-token`,
            options: { ...shared, httpOnly: true },
          },
          callbackUrl: {
            name: `${prefix}authjs.callback-url`,
            options: { ...shared, httpOnly: true },
          },
        },
      }
    : {}),
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const rawEmail = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!rawEmail || !password) return null;
        const email = rawEmail.trim().toLowerCase();

        // Every way in — the login form and Auth.js's own endpoint — passes
        // through here, so this is where guessing is limited.
        const ip = await getClientIp();
        if (!(await loginAllowed(email, ip))) throw new LoginThrottled();

        const user = await prisma.user.findUnique({ where: { email } });
        const valid =
          user !== null &&
          user.status === "ACTIVE" &&
          (await bcrypt.compare(password, user.passwordHash));
        if (!valid) {
          await recordFailedLogin(email, ip);
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = user.role ?? "USER";
        token.id = user.id as string;
        // Sign-in time, seconds since epoch. `requireActiveUser` compares it
        // against User.passwordChangedAt so a password reset immediately
        // invalidates tokens minted before it.
        token.authAt = Math.floor(Date.now() / 1000);
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "USER" | "ADMIN" | "SUPER_ADMIN";
        session.user.authAt = token.authAt as number | undefined;
      }
      return session;
    },
  },
});
