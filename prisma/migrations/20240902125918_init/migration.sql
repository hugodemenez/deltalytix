/*
  Warnings:

  - The `comission` column on the `Trade` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."Trade" DROP COLUMN "comission",
ADD COLUMN     "comission" DOUBLE PRECISION NOT NULL DEFAULT 0;
