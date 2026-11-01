-- Public dynamically registered clients have no owner and no secret.
-- Existing confidential apps keep userId, clientSecretHash, and the default
-- token endpoint auth method.

ALTER TABLE "public"."OAuthApp" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "public"."OAuthApp" ALTER COLUMN "clientSecretHash" DROP NOT NULL;
ALTER TABLE "public"."OAuthApp" ADD COLUMN IF NOT EXISTS "tokenEndpointAuthMethod" TEXT NOT NULL DEFAULT 'client_secret_basic';
ALTER TABLE "public"."OAuthApp" ADD COLUMN IF NOT EXISTS "dynamicallyRegistered" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "public"."OAuthAuthorizationCode" ADD COLUMN IF NOT EXISTS "resource" TEXT;
ALTER TABLE "public"."OAuthAccessToken" ADD COLUMN IF NOT EXISTS "resource" TEXT;

CREATE TABLE IF NOT EXISTS "public"."OAuthRegistrationAttempt" (
    "id" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthRegistrationAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OAuthRegistrationAttempt_keyHash_createdAt_idx"
  ON "public"."OAuthRegistrationAttempt"("keyHash", "createdAt");
