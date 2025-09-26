/*
  Warnings:

  - A unique constraint covering the columns `[userId,service,accountId]` on the table `Synchronization` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."BusinessInvitation" ALTER COLUMN "expiresAt" SET DEFAULT (NOW() + INTERVAL '7 days');

-- CreateIndex
CREATE INDEX "Synchronization_userId_idx" ON "public"."Synchronization"("userId");

-- CreateIndex
CREATE INDEX "Synchronization_service_idx" ON "public"."Synchronization"("service");

-- CreateIndex
CREATE UNIQUE INDEX "Synchronization_userId_service_accountId_key" ON "public"."Synchronization"("userId", "service", "accountId");
