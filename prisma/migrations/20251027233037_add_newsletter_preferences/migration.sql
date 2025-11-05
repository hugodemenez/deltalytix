-- AlterTable
ALTER TABLE "public"."Newsletter" ADD COLUMN     "monthlyStats" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "weeklyUpdates" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "renewalNotifications" BOOLEAN NOT NULL DEFAULT true;
