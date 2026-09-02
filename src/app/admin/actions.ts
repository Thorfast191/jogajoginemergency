"use server";

import { revalidatePath } from "next/cache";
import { getAdmin, requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export type AdminActionState = { error?: string; ok?: boolean };

function revalidateTagViews() {
  revalidatePath("/admin/tags");
  revalidatePath("/admin/tags/issued");
  revalidatePath("/admin");
}

// --- Users --------------------------------------------------------------

export async function setUserStatusAction(userId: string, status: "ACTIVE" | "SUSPENDED") {
  await requireAdmin();

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!target) throw new Error("User not found.");

  // Admin accounts are not customer accounts and must not be suspended or
  // toggled from this screen. Managing admins is a deliberate, separate
  // operation (currently seed/DB only).
  if (target.role === "ADMIN") {
    throw new Error("Admin accounts cannot be modified here.");
  }

  await prisma.user.update({ where: { id: target.id }, data: { status } });
  revalidatePath("/admin/users");
}

// --- Tag inventory: status transitions --------------------------------

const OWNED_STATUSES = ["ACTIVE", "LOST", "DEACTIVATED"] as const;

export async function setTagStatusAction(
  tagId: string,
  status: "UNASSIGNED" | "ACTIVE" | "LOST" | "DEACTIVATED"
): Promise<AdminActionState> {
  const admin = await getAdmin();
  if (!admin) return { error: "Forbidden." };

  const tag = await prisma.tag.findUnique({
    where: { id: tagId },
    select: { id: true, userId: true, status: true },
  });
  if (!tag) return { error: "Tag not found." };

  if (status === "UNASSIGNED") {
    // Return the tag to raw inventory: drop the owner, the order link and the
    // private nickname so a recycled tag carries nothing from its last owner.
    // The public scan page is driven by the owner's EmergencyProfile, which a
    // null userId already detaches.
    await prisma.tag.update({
      where: { id: tag.id },
      data: {
        status: "UNASSIGNED",
        userId: null,
        itemId: null,
        orderItemId: null,
        internalLabel: null,
      },
    });
    revalidateTagViews();
    return { ok: true };
  }

  // ACTIVE / LOST / DEACTIVATED only make sense for a tag that has an owner.
  if (OWNED_STATUSES.includes(status) && !tag.userId) {
    return { error: `Assign this tag to a customer before setting it ${status}.` };
  }

  await prisma.tag.update({ where: { id: tag.id }, data: { status } });
  revalidateTagViews();
  return { ok: true };
}

// --- Tag inventory: assignment ---------------------------------------

export async function assignTagAction(
  userId: string,
  tagId: string
): Promise<AdminActionState> {
  const admin = await getAdmin();
  if (!admin) return { error: "Forbidden." };

  if (!userId || !tagId) return { error: "Pick a customer and a tag." };

  const [tag, user] = await Promise.all([
    prisma.tag.findUnique({
      where: { id: tagId },
      select: { id: true, status: true, userId: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, status: true },
    }),
  ]);

  if (!tag) return { error: "Tag not found." };
  if (tag.status !== "UNASSIGNED" || tag.userId) {
    return { error: "That tag is not in unassigned inventory." };
  }
  if (!user) return { error: "Customer not found." };
  if (user.role !== "USER") return { error: "Tags can only be assigned to customer accounts." };
  if (user.status !== "ACTIVE") return { error: "That customer account is not active." };

  // Physical tags are no longer a subscription entitlement — an admin can hand
  // an inventory tag to any active customer (support, comps, replacements).
  // Guarded write protects against two admins assigning the same tag.
  const claimed = await prisma.tag.updateMany({
    where: { id: tag.id, status: "UNASSIGNED", userId: null },
    data: { userId: user.id, status: "ACTIVE" },
  });
  if (claimed.count !== 1) {
    return { error: "That tag was just assigned to someone else." };
  }

  revalidateTagViews();
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function unassignTagAction(tagId: string): Promise<AdminActionState> {
  // Releasing a tag back to inventory is exactly the UNASSIGNED transition.
  return setTagStatusAction(tagId, "UNASSIGNED");
}

// --- Abuse reports --------------------------------------------------

export async function resolveAbuseReportAction(
  reportId: string,
  status: "REVIEWING" | "RESOLVED" | "DISMISSED"
) {
  await requireAdmin();
  await prisma.abuseReport.update({
    where: { id: reportId },
    data: { status, resolvedAt: status === "RESOLVED" || status === "DISMISSED" ? new Date() : null },
  });
  revalidatePath("/admin/abuse-reports");
}
