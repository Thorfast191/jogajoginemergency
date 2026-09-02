"use server";

import { revalidatePath } from "next/cache";
import { getAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { generateShortCode } from "@/lib/short-code";

export type GenerateTagsState = {
  error?: string;
  created?: number;
};

// Inline until Phase 6 replaces this action with generateTagBatchAction,
// which imports the shared generator from src/lib/claim-code.ts.
const CLAIM_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTVWXYZ";
function inlineClaimCode(): string {
  const group = () =>
    Array.from(
      { length: 4 },
      () => CLAIM_ALPHABET[Math.floor(Math.random() * CLAIM_ALPHABET.length)],
    ).join("");
  return `${group()}-${group()}-${group()}`;
}

// Platform QR tag inventory generation. Admin-only, role-based — this is not
// a customer entitlement and performs no subscription check.
export async function generateTagsAction(
  quantity: number,
): Promise<GenerateTagsState> {
  const admin = await getAdmin();
  if (!admin) {
    return { error: "Forbidden." };
  }

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 500) {
    return { error: "Quantity must be between 1 and 500." };
  }

  let created = 0;

  for (let i = 0; i < quantity; i++) {
    let createdThisTag = false;

    for (let attempt = 0; attempt < 5; attempt++) {
      const shortCode = generateShortCode();

      try {
        await prisma.tag.create({
          data: {
            shortCode,
            claimCode: inlineClaimCode(),
            userId: null,
            status: "UNASSIGNED",
          },
        });

        createdThisTag = true;
        created++;
        break;
      } catch {
        // Unique short-code collision — retry with a fresh code.
      }
    }

    if (!createdThisTag) {
      revalidatePath("/admin/tags");
      revalidatePath("/admin");
      return {
        error: `Only created ${created} of ${quantity} tags. Please try again.`,
        created,
      };
    }
  }

  revalidatePath("/admin/tags");
  revalidatePath("/admin");

  return { created };
}
