/*
  Warnings:

  - You are about to drop the column `layout` on the `Shared` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Shared" DROP COLUMN "layout",
ADD COLUMN     "desktop" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "mobile" JSONB NOT NULL DEFAULT '[]';
