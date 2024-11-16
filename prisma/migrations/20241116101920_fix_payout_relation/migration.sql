-- DropForeignKey
ALTER TABLE "public"."Payout" DROP CONSTRAINT "Payout_accountId_fkey";

-- AlterTable
ALTER TABLE "public"."Payout" ALTER COLUMN "accountId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Payout" ADD CONSTRAINT "Payout_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
