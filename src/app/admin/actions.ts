"use server";

import { revalidatePath } from "next/cache";
import { requireActiveUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const user = await requireActiveUser();
  if (user?.role !== "ADMIN") throw new Error("Forbidden");
  return user;
}

export async function setUserStatusAction(userId: string, status: "ACTIVE" | "SUSPENDED") {
  await requireAdmin();
  await prisma.user.update({ where: { id: userId }, data: { status } });
  revalidatePath("/admin/users");
}

export async function setTagStatusAction(
  tagId: string,
  status: "UNASSIGNED" | "ACTIVE" | "LOST" | "DEACTIVATED"
) {
  await requireAdmin();
  await prisma.tag.update({ where: { id: tagId }, data: { status } });
  revalidatePath("/admin/tags");
}

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
