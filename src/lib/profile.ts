import { prisma } from "@/lib/prisma";
import { PRESET_FLAGS } from "@/lib/privacy";

/**
 * Load a customer's emergency profile, creating a STANDARD-visibility row on
 * first use.
 *
 * Deliberately *not* in a "use server" module. Every exported async function in
 * one of those is a callable endpoint, and this takes a user id and returns the
 * whole profile — blood group, allergies, medical notes, contact details and
 * the privacy flags. Exported as an action it was an unauthenticated read of
 * anyone's medical information. Callers authorize first, then call this.
 */
export async function ensureProfile(userId: string) {
  return prisma.emergencyProfile.upsert({
    where: { userId },
    update: {},
    create: { userId, visibilityPreset: "STANDARD", ...PRESET_FLAGS.STANDARD },
  });
}
