"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateShortCode } from "@/lib/short-code";

export type CreateTagState = { error?: string };

export async function createTagAction(): Promise<CreateTagState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated." };

  const [subscription, tagCount] = await Promise.all([
    prisma.subscription.findFirst({
      where: { userId: session.user.id, status: "ACTIVE" },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.tag.count({ where: { userId: session.user.id } }),
  ]);

  if (!subscription) {
    return { error: "You need an active subscription to create tags." };
  }
  if (tagCount >= subscription.plan.maxTags) {
    return { error: `Your ${subscription.plan.name} plan allows up to ${subscription.plan.maxTags} tags. Upgrade to add more.` };
  }

  // shortCode is unique; collisions are astronomically unlikely at 8 chars
  // from a 56-char alphabet, but retry a couple of times just in case.
  for (let attempt = 0; attempt < 5; attempt++) {
    const shortCode = generateShortCode();
    try {
      await prisma.tag.create({
        data: { shortCode, userId: session.user.id, status: "UNASSIGNED" },
      });
      revalidatePath("/dashboard/tags");
      return {};
    } catch {
      // unique constraint collision — retry with a fresh code
      continue;
    }
  }

  return { error: "Could not generate a unique tag right now. Please try again." };
}
