/*
  Warnings:

  - Added the required column `userId` to the `Payout` table without a default value. This is not possible if the table is not empty.
  - Made the column `accountId` on table `Payout` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."Payout" DROP CONSTRAINT "Payout_accountId_fkey";

-- AlterTable
ALTER TABLE "public"."Payout" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "accountId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Payout_userId_idx" ON "public"."Payout"("userId");

-- AddForeignKey
ALTER TABLE "public"."Payout" ADD CONSTRAINT "Payout_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payout" ADD CONSTRAINT "Payout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
