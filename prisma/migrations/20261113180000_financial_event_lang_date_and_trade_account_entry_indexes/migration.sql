-- FinancialEvent reads were `WHERE lang = $1` with no date predicate, so each
-- call scanned the table. Trade account summaries are
-- `WHERE "userId" = $1 GROUP BY "accountNumber"` with COUNT(*) and MAX("entryDate").
--
-- Plain CREATE INDEX, not CONCURRENTLY.
-- CREATE INDEX takes SHARE: reads continue, INSERT/UPDATE/DELETE wait until the
-- build commits. Trade is about 420k rows / 252 MB and FinancialEvent is tens
-- of thousands of rows, so that wait is seconds.
--
-- CREATE INDEX CONCURRENTLY cannot run inside a transaction (SQLSTATE 25001).
-- Prisma Migrate applies a multi-statement file as one script, which Postgres
-- runs in an implicit transaction, and `prisma migrate deploy` (scripts/vercel-build.sh)
-- is that runner. A failed CONCURRENTLY build also leaves an INVALID index.
-- A transactional build rolls back cleanly, which is the safer option at this size.

CREATE INDEX IF NOT EXISTS "FinancialEvent_lang_date_idx"
  ON "public"."FinancialEvent"("lang", "date");

CREATE INDEX IF NOT EXISTS "Trade_userId_accountNumber_entryDate_idx"
  ON "public"."Trade"("userId", "accountNumber", "entryDate" DESC);
