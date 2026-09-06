-- CreateEnum
CREATE TYPE "ThemeTier" AS ENUM ('FREE', 'PREMIUM');

-- AlterEnum
ALTER TYPE "MediaKind" ADD VALUE 'THEME_ART';

-- AlterTable
ALTER TABLE "EmergencyProfile" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "bioPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "linksPublic" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "themeId" TEXT;

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "themeId" TEXT;

-- CreateTable
CREATE TABLE "Theme" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "tier" "ThemeTier" NOT NULL DEFAULT 'FREE',
    "bgColor" TEXT NOT NULL DEFAULT '#FBF9F6',
    "surfaceColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "inkColor" TEXT NOT NULL DEFAULT '#171717',
    "accentColor" TEXT NOT NULL DEFAULT '#059669',
    "mascot" TEXT NOT NULL DEFAULT 'BLOB',
    "artAssetId" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Theme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileLink" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ProfileLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Theme_slug_key" ON "Theme"("slug");

-- CreateIndex
CREATE INDEX "Theme_status_sortOrder_idx" ON "Theme"("status", "sortOrder");

-- CreateIndex
CREATE INDEX "ProfileLink_profileId_idx" ON "ProfileLink"("profileId");

-- AddForeignKey
ALTER TABLE "Theme" ADD CONSTRAINT "Theme_artAssetId_fkey" FOREIGN KEY ("artAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileLink" ADD CONSTRAINT "ProfileLink_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "EmergencyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

