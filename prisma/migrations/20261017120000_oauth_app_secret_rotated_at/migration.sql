-- Additive, nullable: existing apps keep NULL and the settings UI falls back
-- to "createdAt" for "Secret last rotated". Set on app creation and on
-- POST /api/settings/oauth-apps/[appId]/rotate-secret.
ALTER TABLE "public"."OAuthApp" ADD COLUMN IF NOT EXISTS "secretRotatedAt" TIMESTAMP(3);
