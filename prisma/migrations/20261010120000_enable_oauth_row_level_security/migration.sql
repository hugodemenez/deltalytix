-- The OAuth tables hold token, refresh-token, authorization-code, and client
-- secret hashes. Their migration sorts before
-- 20260926120000_enable_public_row_level_security, but databases that already
-- ran that migration create these tables afterwards, so its catch-all loop
-- never saw them. Enable RLS here with the same rules: ENABLE (not FORCE), so
-- the `postgres` owner Prisma uses still bypasses it; no policies or grants.

DO $$
DECLARE
  prisma_tables text[] := ARRAY[
    'OAuthAccessToken',
    'OAuthApp',
    'OAuthAuthorizationCode'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY prisma_tables LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = t
        AND c.relkind = 'r'
    ) THEN
      RAISE EXCEPTION 'expected Prisma table public.% does not exist', t;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END
$$;
