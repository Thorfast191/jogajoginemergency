-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE 'QR_GENERATION_REMINDER';

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "stickerWidthMm" INTEGER NOT NULL DEFAULT 60;

-- AlterTable
ALTER TABLE "SubscriptionPlan" ADD COLUMN     "intervalMonths" INTEGER NOT NULL DEFAULT 12;

-- AlterTable
ALTER TABLE "Theme" ADD COLUMN     "qrBoxSize" INTEGER NOT NULL DEFAULT 40;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "roleChangedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "supportEmail" TEXT,
    "supportPhone" TEXT,
    "address" TEXT,
    "facebookUrl" TEXT,
    "whatsappUrl" TEXT,
    "announcement" TEXT,
    "ordersPaused" BOOLEAN NOT NULL DEFAULT false,
    "ordersPausedMessage" TEXT,
    "disabledGateways" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_actorId_idx" ON "AdminAuditLog"("actorId");

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
