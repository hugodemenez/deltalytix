-- Drop redundant unique index: @id already enforces uniqueness via Trade_pkey
DROP INDEX IF EXISTS "public"."Trade_id_key";

-- Dashboard / AI queries: filter by userId and sort by entryDate desc
CREATE INDEX IF NOT EXISTS "Trade_userId_entryDate_idx"
  ON "public"."Trade"("userId", "entryDate" DESC);

-- Weekly global cron: range scans on entryDate without userId
CREATE INDEX IF NOT EXISTS "Trade_entryDate_idx"
  ON "public"."Trade"("entryDate");
