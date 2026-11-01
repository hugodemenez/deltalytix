-- Registration attempts are a counter, not a grant. Same rules as the other
-- OAuth tables: ENABLE (not FORCE) so the postgres owner Prisma uses still
-- bypasses it. No policies or grants.

DO $$
DECLARE
  prisma_tables text[] := ARRAY[
    'OAuthRegistrationAttempt'
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
