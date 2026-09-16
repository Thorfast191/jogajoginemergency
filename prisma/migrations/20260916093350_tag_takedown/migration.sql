-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "takenDownAt" TIMESTAMP(3);

-- Backfill: a code that is deactivated now, and whose most recent console
-- status action was a takedown, was taken down by staff. Anything else that is
-- deactivated was switched off by its owner.
UPDATE "Tag" t
SET "takenDownAt" = last."createdAt"
FROM (
  SELECT DISTINCT ON ("targetId") "targetId", "action", "createdAt"
  FROM "AdminAuditLog"
  WHERE "targetType" = 'tag' AND "action" IN ('tag.deactivate', 'tag.reactivate')
  ORDER BY "targetId", "createdAt" DESC
) last
WHERE last."targetId" = t."id"
  AND last."action" = 'tag.deactivate'
  AND t."status" = 'DEACTIVATED';
