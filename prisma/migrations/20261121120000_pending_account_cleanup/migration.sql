-- CreateEnum
CREATE TYPE "public"."PendingAccountCleanupFailure" AS ENUM ('STORAGE', 'STRIPE', 'BOTH');

-- CreateTable
CREATE TABLE "public"."PendingAccountCleanup" (
    "id" TEXT NOT NULL,
    "formerUserId" TEXT,
    "authUserId" TEXT NOT NULL,
    "storagePrefixes" TEXT[],
    "stripeCustomerIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "failureKind" "public"."PendingAccountCleanupFailure" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "PendingAccountCleanup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PendingAccountCleanup_resolvedAt_idx" ON "public"."PendingAccountCleanup"("resolvedAt");

-- CreateIndex
CREATE INDEX "PendingAccountCleanup_authUserId_idx" ON "public"."PendingAccountCleanup"("authUserId");
