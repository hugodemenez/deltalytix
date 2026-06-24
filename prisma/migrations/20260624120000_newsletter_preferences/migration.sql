CREATE TEMPORARY TABLE "_Newsletter_email_backfill" AS
SELECT
  LOWER(TRIM("email")) AS "email",
  BOOL_AND("isActive") AS "isActive",
  (ARRAY_REMOVE(ARRAY_AGG("firstName"), NULL))[1] AS "firstName",
  (ARRAY_REMOVE(ARRAY_AGG("lastName"), NULL))[1] AS "lastName"
FROM "public"."Newsletter"
GROUP BY LOWER(TRIM("email"));

DELETE FROM "public"."Newsletter";

INSERT INTO "public"."Newsletter" ("email", "isActive", "firstName", "lastName")
SELECT "email", "isActive", "firstName", "lastName"
FROM "_Newsletter_email_backfill";

DROP TABLE "_Newsletter_email_backfill";

UPDATE "public"."User" AS u
SET "email" = LOWER(TRIM(u."email"))
WHERE u."email" <> LOWER(TRIM(u."email"))
  AND NOT EXISTS (
    SELECT 1
    FROM "public"."User" AS duplicate_user
    WHERE LOWER(TRIM(duplicate_user."email")) = LOWER(TRIM(u."email"))
      AND duplicate_user."email" <> u."email"
  );

ALTER TABLE "public"."Newsletter"
ADD COLUMN "weeklySummaryEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "monthlyStatsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "renewalNoticeEnabled" BOOLEAN NOT NULL DEFAULT true;
