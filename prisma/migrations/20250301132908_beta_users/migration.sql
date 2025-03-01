-- AlterTable
ALTER TABLE "public"."Post" ADD COLUMN     "screenshots" TEXT[] DEFAULT ARRAY[]::TEXT[];
