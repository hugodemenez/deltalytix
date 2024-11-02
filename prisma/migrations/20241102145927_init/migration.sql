-- AlterTable
ALTER TABLE "public"."Subscription" ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "trialEndsAt" TIMESTAMP(3);
