-- AlterTable
ALTER TABLE "public"."BusinessInvitation" ALTER COLUMN "expiresAt" SET DEFAULT (NOW() + INTERVAL '7 days');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "tradovateEnvironment" TEXT DEFAULT 'demo';
