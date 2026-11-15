-- Audited marker: this manual fill is a different execution from one plant fill.
ALTER TABLE "public"."RithmicProtocolFill"
  ADD COLUMN IF NOT EXISTS "confirmedDistinctFillId" TEXT,
  ADD COLUMN IF NOT EXISTS "confirmedDistinctAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "confirmedDistinctBy" TEXT,
  ADD COLUMN IF NOT EXISTS "confirmDistinctReason" TEXT;
