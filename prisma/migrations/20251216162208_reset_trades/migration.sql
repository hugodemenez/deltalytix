-- AlterTable
ALTER TABLE "public"."Account" ADD COLUMN     "shouldConsiderTradesBeforeReset" BOOLEAN NOT NULL DEFAULT true;
