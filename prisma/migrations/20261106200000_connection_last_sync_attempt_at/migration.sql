-- Degraded Rithmic Protocol syncs must not look healthy (`lastSyncedAt` stays
-- stale) but still need a clock so interval cron does not retry every tick.
ALTER TABLE "public"."Synchronization" ADD COLUMN "lastSyncAttemptAt" TIMESTAMP(3);
