-- Durable Rithmic Protocol fill ledger. Sync upserts by (userId, identityKey)
-- then FIFO derives Trade rows from this table. ENABLE (not FORCE) RLS so the
-- table owner Prisma uses still bypasses it — same as other public tables.

CREATE TABLE "public"."RithmicProtocolFill" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountId" TEXT,
    "identityKey" TEXT NOT NULL,
    "fillId" TEXT NOT NULL DEFAULT '',
    "rawFillId" TEXT,
    "symbol" TEXT NOT NULL,
    "exchange" TEXT,
    "transactionType" TEXT NOT NULL,
    "fillPrice" DOUBLE PRECISION NOT NULL,
    "fillSize" DOUBLE PRECISION NOT NULL,
    "fillDate" TEXT,
    "fillTime" TEXT,
    "basketId" TEXT,
    "sequenceNumber" TEXT,
    "ssboe" INTEGER,
    "usecs" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'history',
    "connectionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RithmicProtocolFill_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RithmicProtocolFill_userId_identityKey_key"
  ON "public"."RithmicProtocolFill"("userId", "identityKey");

CREATE INDEX "RithmicProtocolFill_userId_accountNumber_idx"
  ON "public"."RithmicProtocolFill"("userId", "accountNumber");

CREATE INDEX "RithmicProtocolFill_userId_fillId_idx"
  ON "public"."RithmicProtocolFill"("userId", "fillId");

CREATE INDEX "RithmicProtocolFill_accountId_idx"
  ON "public"."RithmicProtocolFill"("accountId");

CREATE INDEX "RithmicProtocolFill_connectionId_idx"
  ON "public"."RithmicProtocolFill"("connectionId");

DO $$ BEGIN
  ALTER TABLE "public"."RithmicProtocolFill"
    ADD CONSTRAINT "RithmicProtocolFill_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "public"."RithmicProtocolFill"
    ADD CONSTRAINT "RithmicProtocolFill_connectionId_fkey"
    FOREIGN KEY ("connectionId") REFERENCES "public"."Synchronization"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "public"."RithmicProtocolFill" ENABLE ROW LEVEL SECURITY;
