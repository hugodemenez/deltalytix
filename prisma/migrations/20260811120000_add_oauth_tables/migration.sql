-- First-party OAuth apps, authorization codes, and access/refresh/PAT tokens.

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."OAuthApp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "clientId" TEXT NOT NULL,
    "clientSecretHash" TEXT NOT NULL,
    "redirectUris" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."OAuthAuthorizationCode" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "redirectUri" TEXT NOT NULL,
    "codeChallenge" TEXT,
    "codeChallengeMethod" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "OAuthAuthorizationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."OAuthAccessToken" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "tokenHash" TEXT NOT NULL,
    "refreshTokenHash" TEXT,
    "appId" TEXT,
    "userId" TEXT NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "expiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthAccessToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "OAuthApp_clientId_key" ON "public"."OAuthApp"("clientId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OAuthApp_userId_idx" ON "public"."OAuthApp"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "OAuthAuthorizationCode_codeHash_key" ON "public"."OAuthAuthorizationCode"("codeHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OAuthAuthorizationCode_appId_idx" ON "public"."OAuthAuthorizationCode"("appId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OAuthAuthorizationCode_userId_idx" ON "public"."OAuthAuthorizationCode"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "OAuthAccessToken_tokenHash_key" ON "public"."OAuthAccessToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "OAuthAccessToken_refreshTokenHash_key" ON "public"."OAuthAccessToken"("refreshTokenHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OAuthAccessToken_userId_idx" ON "public"."OAuthAccessToken"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OAuthAccessToken_appId_idx" ON "public"."OAuthAccessToken"("appId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "public"."OAuthApp" ADD CONSTRAINT "OAuthApp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "public"."OAuthAuthorizationCode" ADD CONSTRAINT "OAuthAuthorizationCode_appId_fkey" FOREIGN KEY ("appId") REFERENCES "public"."OAuthApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "public"."OAuthAuthorizationCode" ADD CONSTRAINT "OAuthAuthorizationCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "public"."OAuthAccessToken" ADD CONSTRAINT "OAuthAccessToken_appId_fkey" FOREIGN KEY ("appId") REFERENCES "public"."OAuthApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "public"."OAuthAccessToken" ADD CONSTRAINT "OAuthAccessToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
