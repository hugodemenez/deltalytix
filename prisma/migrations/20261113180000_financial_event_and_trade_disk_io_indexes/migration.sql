-- Disk IO indexes. Regular CREATE INDEX, not CONCURRENTLY.
--
-- `prisma migrate deploy` (scripts/vercel-build.sh, beta and main) applies
-- this file through the Prisma 7.8 schema engine. The engine's postgres
-- renderer has a `BEGIN;` / `COMMIT;` fragment, but that is not proof the
-- user script runs as one transaction: a transaction-scoped timeout would be a no-op if a
-- statement is autocommitted before the CREATE INDEX. Session settings apply
-- either way. They are reset at the end so a connection that outlives the
-- script does not keep a 5s lock timeout. If CREATE INDEX fails first, the
-- migrate process exits on DIRECT_URL, so the setting does not leak into the
-- pooler.
--
-- lock_timeout makes the migration fail in 5s if a writer (including a long
-- import) still holds a lock, instead of queueing behind it and then blocking
-- INSERT/UPDATE/DELETE for the whole build. statement_timeout caps how long
-- SHARE is held once the build starts. A timeout aborts the statement. If the
-- engine wrapped the file in a transaction, that transaction rolls back and
-- no index is left behind. If it did not, a failed CREATE INDEX leaves no
-- index either.
--
-- CREATE INDEX IF NOT EXISTS turns a pre-built index into a catalog no-op.
-- The CONCURRENTLY pre-step is the default runbook step in the PR body; it is
-- not run here. An INVALID index with the same name makes this migration a
-- silent no-op (NOTICE) and Prisma records it as applied; the deploy does not
-- fail. Before merging, check:
--
--   SELECT indexrelid::regclass, indisvalid
--   FROM pg_index
--   WHERE indexrelid::regclass::text IN (
--     '"Trade_userId_accountNumber_entryDate_idx"',
--     '"FinancialEvent_lang_date_idx"'
--   );
--
-- If either is invalid, DROP INDEX CONCURRENTLY it and rebuild. That check and
-- the rebuild SQL are in the PR body.
--
-- Recovery when deploy fails: the build exits non-zero, Prisma records this
-- migration as failed, and the next `prisma migrate deploy` stops with P3009
-- until the failed row is cleared. Mark it rolled back (do not --applied
-- unless both indexes are already present and indisvalid) and redeploy:
--
--   bunx prisma migrate resolve --rolled-back 20261113180000_financial_event_and_trade_disk_io_indexes
--
-- Existing indexes are left in place.

SET lock_timeout = '5s';
SET statement_timeout = '60s';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FinancialEvent_lang_date_idx" ON "public"."FinancialEvent"("lang", "date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Trade_userId_accountNumber_entryDate_idx" ON "public"."Trade"("userId", "accountNumber", "entryDate" DESC);

RESET lock_timeout;
RESET statement_timeout;
