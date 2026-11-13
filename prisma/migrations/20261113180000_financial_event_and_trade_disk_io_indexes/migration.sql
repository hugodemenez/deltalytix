-- Disk IO indexes. Regular CREATE INDEX, not CONCURRENTLY.
--
-- `prisma migrate deploy` (scripts/vercel-build.sh, beta and main) runs each
-- migration inside a transaction. PostgreSQL rejects
-- CREATE INDEX CONCURRENTLY in a transaction, and this Prisma 7.8 schema
-- engine has no switch to opt a migration out. A failed CONCURRENTLY build
-- would also leave an INVALID index that blocks the next deploy until someone
-- drops it on prod. Trade is ~420k rows / 252 MB and FinancialEvent is tens
-- of thousands of rows, so a blocking build is short.
--
-- CREATE INDEX takes SHARE on the table: SELECT continues, INSERT/UPDATE/DELETE
-- wait until this transaction commits. Both indexes are built before the
-- commit, so the write lock lasts for the sum of the two builds. Existing
-- indexes are left in place.

-- CreateIndex
CREATE INDEX "FinancialEvent_lang_date_idx" ON "public"."FinancialEvent"("lang", "date");

-- CreateIndex
CREATE INDEX "Trade_userId_accountNumber_entryDate_idx" ON "public"."Trade"("userId", "accountNumber", "entryDate" DESC);
