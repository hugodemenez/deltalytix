-- Re-key DxFeed connection rows from the legacy bare-login accountId to the
-- prop-firm-scoped "<propFirmId>:<login>" format so re-authentication updates
-- the existing row instead of creating a stale duplicate.
--
-- Legacy accountId was the raw login; the canonical id is
-- "<propFirmId>:<lower(trim(login))>". propFirmId is read from the stored
-- credentials JSON (token column). Rows whose token is not a JSON object or has
-- no propFirmId are left untouched (handled at sync/auth time instead).

-- 1. Drop legacy rows that would collide with an already-migrated row for the
--    same user (otherwise the rename below would violate the unique index).
DELETE FROM "public"."Synchronization" s
WHERE s."service" = 'dxfeed'
  AND s."token" LIKE '{%'
  AND (s."token"::jsonb ->> 'propFirmId') IS NOT NULL
  AND (s."token"::jsonb ->> 'propFirmId') <> ''
  AND s."accountId" NOT LIKE ((s."token"::jsonb ->> 'propFirmId') || ':%')
  AND EXISTS (
    SELECT 1
    FROM "public"."Synchronization" t
    WHERE t."userId" = s."userId"
      AND t."service" = 'dxfeed'
      AND t."accountId" = (s."token"::jsonb ->> 'propFirmId') || ':' || lower(btrim(s."accountId"))
  );

-- 2. Re-key the remaining legacy rows to the prop-firm-scoped accountId.
UPDATE "public"."Synchronization" s
SET "accountId" = (s."token"::jsonb ->> 'propFirmId') || ':' || lower(btrim(s."accountId"))
WHERE s."service" = 'dxfeed'
  AND s."token" LIKE '{%'
  AND (s."token"::jsonb ->> 'propFirmId') IS NOT NULL
  AND (s."token"::jsonb ->> 'propFirmId') <> ''
  AND s."accountId" NOT LIKE ((s."token"::jsonb ->> 'propFirmId') || ':%');
