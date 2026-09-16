import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/client-ip";
import { LoginThrottled, loginAllowed, recordFailedLogin } from "@/lib/login-throttle";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
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
