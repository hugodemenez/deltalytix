/*
  Warnings:

  - You are about to drop the column `managerIds` on the `Team` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Team" DROP COLUMN "managerIds";

-- CreateTable
CREATE TABLE "public"."TeamManager" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "access" TEXT NOT NULL DEFAULT 'viewer',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamManager_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamManager_teamId_idx" ON "public"."TeamManager"("teamId");

-- CreateIndex
CREATE INDEX "TeamManager_managerId_idx" ON "public"."TeamManager"("managerId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamManager_teamId_managerId_key" ON "public"."TeamManager"("teamId", "managerId");

-- AddForeignKey
ALTER TABLE "public"."TeamManager" ADD CONSTRAINT "TeamManager_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
