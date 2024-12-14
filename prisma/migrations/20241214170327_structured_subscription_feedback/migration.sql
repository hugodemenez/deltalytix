/*
  Warnings:

  - You are about to drop the column `metadata` on the `SubscriptionFeedback` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."SubscriptionFeedback" DROP COLUMN "metadata",
ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "feedback" TEXT;
