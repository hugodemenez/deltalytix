/*
  Warnings:

  - You are about to drop the column `comission` on the `Trade` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Trade" DROP COLUMN "comission",
ADD COLUMN     "commission" DOUBLE PRECISION NOT NULL DEFAULT 0;
