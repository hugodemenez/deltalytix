-- AlterTable
ALTER TABLE "public"."Mood" ADD COLUMN "selectedTags" TEXT[] DEFAULT ARRAY[]::TEXT[];
