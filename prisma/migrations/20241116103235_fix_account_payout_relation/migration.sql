-- DropForeignKey
ALTER TABLE "public"."Payout" DROP CONSTRAINT "Payout_accountId_fkey";

-- AddForeignKey
ALTER TABLE "public"."Payout" ADD CONSTRAINT "Payout_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
