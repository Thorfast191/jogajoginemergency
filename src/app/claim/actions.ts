"use server";

import { redirect } from "next/navigation";
import { requireCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { normalizeClaimCode } from "@/lib/claim-code";
import { rateLimit } from "@/lib/rate-limit";
import { claimSchema } from "@/lib/validations";

export type ClaimState = { error?: string };

export async function claimTagAction(
  _prev: ClaimState,
  formData: FormData,
): Promise<ClaimState> {
  let user;
  try {
    user = await requireCustomer();
  } catch {
    return { error: "Not authorized." };
  }

  const parsed = claimSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) return { error: "Enter a claim code." };

  const code = normalizeClaimCode(parsed.data.code);

  if (!rateLimit(`claim:${user.id}`, { limit: 10, windowMs: 10 * 60_000 }).allowed) {
    return { error: "Too many attempts. Try again later." };
  }
  if (!rateLimit(`claim-code:${code}`, { limit: 5, windowMs: 10 * 60_000 }).allowed) {
    return { error: "Too many attempts for this code. Try again later." };
  }

  // Guarded claim: only succeeds if the code exists and the tag is unowned.
  const claimed = await prisma.tag.updateMany({
    where: { claimCode: code, userId: null, status: { not: "DEACTIVATED" } },
    data: { userId: user.id, status: "ACTIVE" },
  });
  if (claimed.count !== 1) {
    return { error: "That code isn't valid or has already been used." };
  }

  const tag = await prisma.tag.findUnique({ where: { claimCode: code }, select: { id: true } });
  redirect(tag ? `/dashboard/tags/${tag.id}` : "/dashboard/tags");
}
