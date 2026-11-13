-- Disk IO indexes. Regular CREATE INDEX, not CONCURRENTLY.
--
-- `prisma migrate deploy` (scripts/vercel-build.sh, beta and main) runs this
-- file inside one transaction. PostgreSQL rejects CREATE INDEX CONCURRENTLY
-- in a transaction, and this Prisma 7.8 schema engine has no switch to opt a
-- migration out. A failed CONCURRENTLY build would also leave an INVALID
-- index that blocks the next deploy until someone drops it on prod.
--
-- SET LOCAL lasts for that transaction. lock_timeout makes the migration fail
-- in 5s if a writer (including a long import) still holds a lock, instead of
-- queueing behind it and then blocking INSERT/UPDATE/DELETE for the whole
-- build. statement_timeout caps how long SHARE is held once the build starts.
-- Either timeout aborts the statement, the transaction rolls back, and no
-- index is left behind.
--
-- CREATE INDEX IF NOT EXISTS turns a pre-built index into a catalog no-op.
-- The optional off-peak statements are in the PR body; they are not run here.
--
-- Recovery when deploy fails: the build exits non-zero, Prisma records this
-- migration as failed, and the next `prisma migrate deploy` stops with P3009
-- until the failed row is cleared. The SQL rolled back, so mark it rolled
-- back (do not --applied unless both indexes are already present) and redeploy:
--
--   bunx prisma migrate resolve --rolled-back 20261113180000_financial_event_and_trade_disk_io_indexes
--
-- Existing indexes are left in place.

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FinancialEvent_lang_date_idx" ON "public"."FinancialEvent"("lang", "date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Trade_userId_accountNumber_entryDate_idx" ON "public"."Trade"("userId", "accountNumber", "entryDate" DESC);
