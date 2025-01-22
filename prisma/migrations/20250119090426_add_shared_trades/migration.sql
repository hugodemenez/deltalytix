-- CreateTable
CREATE TABLE "public"."SharedTrades" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trades" JSONB NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "accountNumbers" TEXT[],
    "dateRange" JSONB NOT NULL,

    CONSTRAINT "SharedTrades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SharedLayout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "layout" JSONB NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "viewCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SharedLayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SharedTrades_slug_key" ON "public"."SharedTrades"("slug");

-- CreateIndex
CREATE INDEX "SharedTrades_userId_idx" ON "public"."SharedTrades"("userId");

-- CreateIndex
CREATE INDEX "SharedTrades_slug_idx" ON "public"."SharedTrades"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SharedLayout_slug_key" ON "public"."SharedLayout"("slug");

-- CreateIndex
CREATE INDEX "SharedLayout_userId_idx" ON "public"."SharedLayout"("userId");

-- CreateIndex
CREATE INDEX "SharedLayout_slug_idx" ON "public"."SharedLayout"("slug");
