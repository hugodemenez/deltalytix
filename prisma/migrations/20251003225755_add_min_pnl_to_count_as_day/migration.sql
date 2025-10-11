-- AlterTable
ALTER TABLE "public"."Account" ADD COLUMN     "minPnlToCountAsDay" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "public"."BusinessInvitation" ALTER COLUMN "expiresAt" SET DEFAULT (NOW() + INTERVAL '7 days');
