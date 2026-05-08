ALTER TABLE "public"."Newsletter"
ADD COLUMN "weeklySummaryEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "monthlyStatsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "renewalNoticeEnabled" BOOLEAN NOT NULL DEFAULT true;
