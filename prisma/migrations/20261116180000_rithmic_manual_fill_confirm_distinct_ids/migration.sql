-- One manual fill can be confirmed distinct from several plant fills.
-- Additive: "confirmedDistinctFillId" stays so a rolling deploy can still
-- select the column the previous app reads. Do not drop it in this migration.
ALTER TABLE "public"."RithmicProtocolFill"
  ADD COLUMN IF NOT EXISTS "confirmedDistinctFillIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Copy each existing single marker into the list. Idempotent: an id already
-- present is left where it is, and a later run does not append it again.
UPDATE "public"."RithmicProtocolFill"
SET "confirmedDistinctFillIds" = "confirmedDistinctFillIds" || ARRAY["confirmedDistinctFillId"]
WHERE "confirmedDistinctFillId" IS NOT NULL
  AND btrim("confirmedDistinctFillId") <> ''
  AND NOT ("confirmedDistinctFillId" = ANY ("confirmedDistinctFillIds"));
