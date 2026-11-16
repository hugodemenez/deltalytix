-- Soft-retire audit for operator manual fills. Nullable so existing rows stay valid.
ALTER TABLE "public"."RithmicProtocolFill"
  ADD COLUMN IF NOT EXISTS "retiredAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "retiredBy" TEXT,
  ADD COLUMN IF NOT EXISTS "retireReason" TEXT;
