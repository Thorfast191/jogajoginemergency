-- AlterTable
ALTER TABLE "EmergencyProfile" ADD COLUMN     "consentAt" TIMESTAMP(3),
ADD COLUMN     "consentVersion" TEXT,
ALTER COLUMN "visibilityPreset" SET DEFAULT 'MINIMAL',
ALTER COLUMN "photoPublic" SET DEFAULT false,
ALTER COLUMN "namePublic" SET DEFAULT false,
ALTER COLUMN "contactsPublic" SET DEFAULT false;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;

