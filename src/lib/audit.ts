import { prisma } from "@/lib/prisma";

/**
 * Record a console action in the activity log.
 *
 * Called after the change it describes has been written. `summary` is the
 * sentence a super admin reads ("Extended Nadia's subscription by 3 months");
 * `action` and `target` are for filtering. Every money, pricing, destructive
 * and admin-management action calls this — see src/lib/permissions.ts.
 */
export async function audit(
  actorId: string,
  action: string,
  target: { type: string; id: string },
  summary: string,
): Promise<void> {
  await prisma.adminAuditLog.create({
    data: {
      actorId,
      action,
      targetType: target.type,
      targetId: target.id,
      summary: summary.slice(0, 500),
    },
  });
}
