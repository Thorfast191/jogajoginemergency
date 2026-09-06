-- Tags become customer-generated. Unowned inventory rows predate this model
-- and cannot satisfy the NOT NULL owner below, so they are removed first
-- along with anything that referenced them.
DELETE FROM "ScanEvent" WHERE "tagId" IN (SELECT "id" FROM "Tag" WHERE "userId" IS NULL);
DELETE FROM "RelayMessage" WHERE "tagId" IN (SELECT "id" FROM "Tag" WHERE "userId" IS NULL);
UPDATE "AbuseReport" SET "tagId" = NULL WHERE "tagId" IN (SELECT "id" FROM "Tag" WHERE "userId" IS NULL);
DELETE FROM "Tag" WHERE "userId" IS NULL;

-- AlterEnum
ALTER TYPE "PaymentProvider" ADD VALUE 'NAGAD';

-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'CANCELLED';

-- AlterEnum
BEGIN;
CREATE TYPE "TagStatus_new" AS ENUM ('ACTIVE', 'LOST', 'DEACTIVATED');
ALTER TABLE "public"."Tag" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Tag" ALTER COLUMN "status" TYPE "TagStatus_new" USING ("status"::text::"TagStatus_new");
ALTER TYPE "TagStatus" RENAME TO "TagStatus_old";
ALTER TYPE "TagStatus_new" RENAME TO "TagStatus";
DROP TYPE "public"."TagStatus_old";
ALTER TABLE "Tag" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- DropForeignKey
ALTER TABLE "Tag" DROP CONSTRAINT "Tag_batchId_fkey";

-- DropForeignKey
ALTER TABLE "Tag" DROP CONSTRAINT "Tag_userId_fkey";

-- DropForeignKey
ALTER TABLE "TagBatch" DROP CONSTRAINT "TagBatch_createdById_fkey";

-- DropForeignKey
ALTER TABLE "TagBatch" DROP CONSTRAINT "TagBatch_productId_fkey";

-- DropIndex
DROP INDEX "Tag_claimCode_key";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "reservationExpiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "failureReason" TEXT,
ADD COLUMN     "gatewayPaymentId" TEXT,
ADD COLUMN     "settledAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "qrSlots" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Tag" DROP COLUMN "batchId",
DROP COLUMN "claimCode",
ALTER COLUMN "userId" SET NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Theme" DROP COLUMN "tier";

-- DropTable
DROP TABLE "TagBatch";

-- DropEnum
DROP TYPE "ThemeTier";

-- CreateIndex
CREATE INDEX "Payment_gatewayPaymentId_idx" ON "Payment"("gatewayPaymentId");

-- CreateIndex
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

