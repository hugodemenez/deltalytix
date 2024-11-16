/*
  Warnings:

  - You are about to drop the column `accountId` on the `Payout` table. All the data in the column will be lost.
  - Added the required column `accountNumber` to the `Payout` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Payout" DROP CONSTRAINT "Payout_accountId_fkey";

-- DropIndex
DROP INDEX "public"."Payout_accountId_idx";

-- AlterTable
ALTER TABLE "public"."Payout" DROP COLUMN "accountId",
ADD COLUMN     "accountNumber" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Payout_accountNumber_idx" ON "public"."Payout"("accountNumber");
