/*
  Warnings:

  - You are about to drop the column `widgets` on the `DashboardLayout` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."DashboardLayout" DROP COLUMN "widgets",
ADD COLUMN     "desktop" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "mobile" JSONB NOT NULL DEFAULT '[]';
