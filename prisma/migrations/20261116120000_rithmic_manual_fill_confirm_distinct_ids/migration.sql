-- A manual fill can be confirmed distinct from several plant fills.
-- Additive: the old scalar stays. A rollback of the app still reads
-- confirmedDistinctFillId (the latest id). This statement does not drop it.
ALTER TABLE "public"."RithmicProtocolFill"
  ADD COLUMN IF NOT EXISTS "confirmedDistinctFillIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Copy each existing scalar into the list. Skip blanks. Skip rows that
-- already contain that id, so a retry cannot duplicate it or drop ids the
-- new app appended after this column existed.
UPDATE "public"."RithmicProtocolFill"
SET "confirmedDistinctFillIds" = "confirmedDistinctFillIds" || ARRAY["confirmedDistinctFillId"]
WHERE "confirmedDistinctFillId" IS NOT NULL
  AND btrim("confirmedDistinctFillId") <> ''
  AND NOT ("confirmedDistinctFillIds" @> ARRAY["confirmedDistinctFillId"]);
