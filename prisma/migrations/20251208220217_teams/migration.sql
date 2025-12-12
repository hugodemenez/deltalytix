-- AlterTable
ALTER TABLE "public"."Team" ADD COLUMN     "traderIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
