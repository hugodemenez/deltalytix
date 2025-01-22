/*
  Warnings:

  - You are about to drop the `SharedLayout` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SharedTrades` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "public"."SharedLayout";

-- DropTable
DROP TABLE "public"."SharedTrades";

-- CreateTable
CREATE TABLE "public"."Shared" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "accountNumbers" TEXT[],
    "dateRange" JSONB NOT NULL,
    "layout" JSONB,

    CONSTRAINT "Shared_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shared_slug_key" ON "public"."Shared"("slug");

-- CreateIndex
CREATE INDEX "Shared_userId_idx" ON "public"."Shared"("userId");

-- CreateIndex
CREATE INDEX "Shared_slug_idx" ON "public"."Shared"("slug");
