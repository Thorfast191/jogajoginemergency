import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Session JWTs are only checked against `User.status` at sign-in. Without
// this, an admin suspending a user has no effect until that user's token
// expires. Every mutating action (and the dashboard/admin layouts) should
// call this instead of reading `session.user` directly.
export async function requireActiveUser() {
  const session = await auth();
  if (!session?.user) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, status: true },
  });
  if (!user || user.status !== "ACTIVE") return null;

  return user;
}
