-- Defense in depth: enable RLS on every public table Prisma owns.
--
-- ENABLE (not FORCE) so the table owner — the `postgres` role Prisma uses —
-- continues to bypass RLS. This repo does not read or write public tables
-- through the Supabase Data API; anon/authenticated/service_role have no
-- table grants. No policies are added. No data or grants are changed.
--
-- ALTER TABLE ... ENABLE ROW LEVEL SECURITY is a no-op when RLS is already on.

DO $$
DECLARE
  prisma_tables text[] := ARRAY[
    'Account',
    'Business',
    'BusinessInvitation',
    'BusinessManager',
    'BusinessSubscription',
    'Comment',
    'DashboardLayout',
    'FinancialEvent',
    'Group',
    'HistoricalData',
    'Mood',
    'Newsletter',
    'Notification',
    'Order',
    'Payout',
    'Post',
    'Referral',
    'Shared',
    'Subscription',
    'SubscriptionFeedback',
    'Synchronization',
    'Tag',
    'Team',
    'TeamInvitation',
    'TeamManager',
    'TeamSubscription',
    'TickDetails',
    'Trade',
    'TradeAnalytics',
    'User',
    'Vote'
  ];
  t text;
  r record;
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

  -- Cover leftover / non-Prisma public tables (prod currently has extras
  -- beyond schema.prisma, plus `_prisma_migrations`). Owner still bypasses.
  FOR r IN
    SELECT c.relname AS tablename
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND NOT c.relrowsecurity
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END
$$;
