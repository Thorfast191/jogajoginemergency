-- Drop the legacy Item model and the Tag public-profile fields that moved to
-- EmergencyProfile. Destructive: the Item table and those four Tag columns are
-- removed. The redesign backfill copied every value the new model needs before
-- this migration.

-- Tag: drop the moved public fields + the Item link
ALTER TABLE "Tag" DROP CONSTRAINT IF EXISTS "Tag_itemId_fkey";
DROP INDEX IF EXISTS "Tag_itemId_idx";
ALTER TABLE "Tag"
  DROP COLUMN "itemId",
  DROP COLUMN "publicDisplayName",
  DROP COLUMN "publicMessage",
  DROP COLUMN "maskedPhone",
  DROP COLUMN "contactMode";

-- Remove the legacy belongings model
DROP TABLE "Item";

-- ContactMode: drop the stale MASKED_PHONE member (only EmergencyProfile uses
-- the type now, and only ever RELAY / DIRECT_CALL).
CREATE TYPE "ContactMode_new" AS ENUM ('RELAY', 'DIRECT_CALL');
ALTER TABLE "EmergencyProfile" ALTER COLUMN "contactMode" DROP DEFAULT;
ALTER TABLE "EmergencyProfile"
  ALTER COLUMN "contactMode" TYPE "ContactMode_new"
  USING ("contactMode"::text::"ContactMode_new");
ALTER TABLE "EmergencyProfile" ALTER COLUMN "contactMode" SET DEFAULT 'RELAY';
DROP TYPE "ContactMode";
ALTER TYPE "ContactMode_new" RENAME TO "ContactMode";
