-- AlterTable
ALTER TABLE "public"."Account" ADD COLUMN     "trailingDrawdown" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trailingStopProfit" DOUBLE PRECISION;
