-- Append-only audit of confirm-distinct adds and removes.
-- Additive. Does not rewrite confirmedDistinctFillIds or the deprecated scalar.
ALTER TABLE "public"."RithmicProtocolFill"
  ADD COLUMN IF NOT EXISTS "confirmedDistinctAudit" JSONB NOT NULL DEFAULT '[]'::jsonb;
