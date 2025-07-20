/*
  Warnings:

  - You are about to drop the column `managerIds` on the `Business` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Business" DROP COLUMN "managerIds";

-- CreateTable
CREATE TABLE "public"."BusinessManager" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "access" TEXT NOT NULL DEFAULT 'viewer',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessManager_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusinessManager_businessId_idx" ON "public"."BusinessManager"("businessId");

-- CreateIndex
CREATE INDEX "BusinessManager_managerId_idx" ON "public"."BusinessManager"("managerId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessManager_businessId_managerId_key" ON "public"."BusinessManager"("businessId", "managerId");

-- AddForeignKey
ALTER TABLE "public"."BusinessManager" ADD CONSTRAINT "BusinessManager_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
