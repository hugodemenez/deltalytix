/*
  Warnings:

  - A unique constraint covering the columns `[businessId]` on the table `BusinessSubscription` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `businessId` to the `BusinessSubscription` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."BusinessSubscription" ADD COLUMN     "businessId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "BusinessSubscription_businessId_key" ON "public"."BusinessSubscription"("businessId");

-- CreateIndex
CREATE INDEX "BusinessSubscription_businessId_idx" ON "public"."BusinessSubscription"("businessId");

-- AddForeignKey
ALTER TABLE "public"."BusinessSubscription" ADD CONSTRAINT "BusinessSubscription_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
