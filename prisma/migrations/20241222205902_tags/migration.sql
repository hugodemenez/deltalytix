-- AlterTable
ALTER TABLE "public"."Trade" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
