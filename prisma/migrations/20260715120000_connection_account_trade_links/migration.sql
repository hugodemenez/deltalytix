-- AlterTable Trade: add nullable accountId FK
ALTER TABLE "public"."Trade" ADD COLUMN IF NOT EXISTS "accountId" TEXT;

-- AlterTable Account: add nullable connectionId FK
ALTER TABLE "public"."Account" ADD COLUMN IF NOT EXISTS "connectionId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Trade_accountId_idx" ON "public"."Trade"("accountId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Account_connectionId_idx" ON "public"."Account"("connectionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Account_userId_connectionId_idx" ON "public"."Account"("userId", "connectionId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "public"."Trade" ADD CONSTRAINT "Trade_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "public"."Synchronization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
