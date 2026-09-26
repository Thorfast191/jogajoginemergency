-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "planId" TEXT,
ADD COLUMN     "planPriceCents" INTEGER;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "themeId" TEXT;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme"("id") ON DELETE SET NULL ON UPDATE CASCADE;
