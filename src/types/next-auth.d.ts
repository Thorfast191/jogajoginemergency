import { DefaultSession } from "next-auth";

type AppRole = "USER" | "ADMIN" | "SUPER_ADMIN";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AppRole;
      /** Sign-in time, seconds since epoch. See src/lib/token-freshness.ts. */
      authAt?: number;
    } & DefaultSession["user"];
  }

  interface User {
    role?: AppRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: AppRole;
    authAt?: number;
  }
}
