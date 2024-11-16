/*
  Warnings:

  - You are about to drop the column `payoutCount` on the `Account` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Payout" DROP CONSTRAINT "Payout_accountId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Payout" DROP CONSTRAINT "Payout_userId_fkey";

-- DropIndex
DROP INDEX "public"."Payout_userId_idx";

-- AlterTable
ALTER TABLE "public"."Account" DROP COLUMN "payoutCount";

-- AddForeignKey
ALTER TABLE "public"."Payout" ADD CONSTRAINT "Payout_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
