/*
  Warnings:

  - You are about to drop the column `tradovateAccessToken` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `tradovateEnvironment` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `tradovateExpiresAt` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."BusinessInvitation" ALTER COLUMN "expiresAt" SET DEFAULT (NOW() + INTERVAL '7 days');

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "tradovateAccessToken",
DROP COLUMN "tradovateEnvironment",
DROP COLUMN "tradovateExpiresAt";

-- CreateTable
CREATE TABLE "public"."Synchronization" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),

    CONSTRAINT "Synchronization_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Synchronization" ADD CONSTRAINT "Synchronization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
