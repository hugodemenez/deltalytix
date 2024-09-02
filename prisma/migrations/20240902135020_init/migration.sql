/*
  Warnings:

  - The `timeInPosition` column on the `Trade` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."Trade" DROP COLUMN "timeInPosition",
ADD COLUMN     "timeInPosition" DOUBLE PRECISION NOT NULL DEFAULT 0;
