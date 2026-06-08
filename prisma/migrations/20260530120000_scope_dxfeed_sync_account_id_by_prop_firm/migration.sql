-- Re-key DxFeed connection rows from the legacy bare-login accountId to the
-- prop-firm-scoped "<propFirmId>:<login>" format so re-authentication updates
-- the existing row instead of creating a stale duplicate.
--
-- Legacy accountId was the raw login; the canonical id is
-- "<propFirmId>:<lower(trim(login))>". propFirmId is read from the stored
-- credentials JSON (token column). Rows whose token is not a JSON object or has
-- no propFirmId are left untouched (handled at sync/auth time instead).

-- 1. Collapse every group of rows that map to the same canonical accountId down
--    to a single row, so the rename below can never hit the unique index. This
--    covers legacy-vs-already-migrated collisions as well as two legacy rows that
--    only differ by login casing (the old unique index was case-sensitive).
--    The surviving row prefers one already in canonical form, then the most
--    recently synced.
WITH ranked AS (
  SELECT
    "id",
    CASE
      WHEN "accountId" LIKE (("token"::jsonb ->> 'propFirmId') || ':%')
        THEN "accountId"
      ELSE ("token"::jsonb ->> 'propFirmId') || ':' || lower(btrim("accountId"))
    END AS canonical_id,
    ROW_NUMBER() OVER (
      PARTITION BY
        "userId",
        CASE
          WHEN "accountId" LIKE (("token"::jsonb ->> 'propFirmId') || ':%')
            THEN "accountId"
          ELSE ("token"::jsonb ->> 'propFirmId') || ':' || lower(btrim("accountId"))
        END
      ORDER BY
        (CASE WHEN "accountId" LIKE (("token"::jsonb ->> 'propFirmId') || ':%') THEN 0 ELSE 1 END),
        "lastSyncedAt" DESC,
        "updatedAt" DESC
    ) AS rn
  FROM "public"."Synchronization"
  WHERE "service" = 'dxfeed'
    AND "token" LIKE '{%'
    AND ("token"::jsonb ->> 'propFirmId') IS NOT NULL
    AND ("token"::jsonb ->> 'propFirmId') <> ''
)
DELETE FROM "public"."Synchronization" s
USING ranked r
WHERE s."id" = r."id"
  AND r.rn > 1;

-- 2. Re-key the remaining legacy rows to the prop-firm-scoped accountId.
UPDATE "public"."Synchronization" s
SET "accountId" = (s."token"::jsonb ->> 'propFirmId') || ':' || lower(btrim(s."accountId"))
WHERE s."service" = 'dxfeed'
  AND s."token" LIKE '{%'
  AND (s."token"::jsonb ->> 'propFirmId') IS NOT NULL
  AND (s."token"::jsonb ->> 'propFirmId') <> ''
  AND s."accountId" NOT LIKE ((s."token"::jsonb ->> 'propFirmId') || ':%');
