/*
  Warnings:

  - A unique constraint covering the columns `[number,userId]` on the table `Account` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `accountId` to the `Payout` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."Account_number_key";

-- AlterTable
ALTER TABLE "public"."Payout" ADD COLUMN     "accountId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Account_number_userId_key" ON "public"."Account"("number", "userId");

-- CreateIndex
CREATE INDEX "Trade_accountNumber_idx" ON "public"."Trade"("accountNumber");

-- AddForeignKey
ALTER TABLE "public"."Payout" ADD CONSTRAINT "Payout_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
