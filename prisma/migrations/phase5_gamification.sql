-- Phase 5: Gamification
-- Run after: prisma migrate deploy (or apply manually)

CREATE TYPE public."AchievementCategory" AS ENUM
  ('TRADING', 'CONSISTENCY', 'RISK', 'SOCIAL', 'MILESTONE');

CREATE TYPE public."AchievementRarity" AS ENUM
  ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- UserStats: one row per user, updated on every trade sync
CREATE TABLE public."UserStats" (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"             TEXT NOT NULL UNIQUE REFERENCES public."User"(id) ON DELETE CASCADE,
  xp                   INT  NOT NULL DEFAULT 0,
  level                INT  NOT NULL DEFAULT 1,
  "totalTrades"        INT  NOT NULL DEFAULT 0,
  "winRate"            FLOAT NOT NULL DEFAULT 0,
  "avgRR"              FLOAT NOT NULL DEFAULT 0,
  "bestStreak"         INT  NOT NULL DEFAULT 0,
  "currentStreak"      INT  NOT NULL DEFAULT 0,
  "totalPnl"           FLOAT NOT NULL DEFAULT 0,
  "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_userstats_xp ON public."UserStats"(xp DESC);
CREATE INDEX idx_userstats_userid ON public."UserStats"("userId");

-- Achievement catalogue (seeded from lib/gamification/achievements.ts)
CREATE TABLE public."Achievement" (
  id          TEXT PRIMARY KEY,            -- e.g. 'first_trade'
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  icon        TEXT NOT NULL,               -- emoji
  category    public."AchievementCategory" NOT NULL,
  rarity      public."AchievementRarity"  NOT NULL,
  xp          INT  NOT NULL DEFAULT 0,
  condition   JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- UserAchievement: earned achievements per user
CREATE TABLE public."UserAchievement" (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"        TEXT NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  "achievementId" TEXT NOT NULL REFERENCES public."Achievement"(id) ON DELETE CASCADE,
  "earnedAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  notified        BOOLEAN NOT NULL DEFAULT false,
  UNIQUE("userId", "achievementId")
);
CREATE INDEX idx_userachievement_user ON public."UserAchievement"("userId");

-- Streak: daily login / trading streaks
CREATE TABLE public."Streak" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"      TEXT NOT NULL UNIQUE REFERENCES public."User"(id) ON DELETE CASCADE,
  current       INT  NOT NULL DEFAULT 0,
  longest       INT  NOT NULL DEFAULT 0,
  "lastActiveAt" DATE NOT NULL DEFAULT CURRENT_DATE,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_streak_userid ON public."Streak"("userId");

-- Seed: achievement catalogue
INSERT INTO public."Achievement" (id, title, description, icon, category, rarity, xp, condition) VALUES
  ('first_trade',       'First Blood',           'Complete your first trade',                          '⚔️',  'TRADING',      'COMMON',    50,  '{"totalTrades":1}'),
  ('trades_10',         'Getting Started',        'Complete 10 trades',                                 '🔟',  'TRADING',      'COMMON',    100, '{"totalTrades":10}'),
  ('trades_50',         'Experienced Trader',     'Complete 50 trades',                                 '📊',  'TRADING',      'UNCOMMON',  250, '{"totalTrades":50}'),
  ('trades_100',        'Century Club',           'Complete 100 trades',                                '💯',  'TRADING',      'RARE',      500, '{"totalTrades":100}'),
  ('trades_500',        'Trading Machine',        'Complete 500 trades',                                '🤖',  'TRADING',      'EPIC',      1500,'{"totalTrades":500}'),
  ('trades_1000',       'The Legend',             'Complete 1 000 trades',                              '🏆',  'TRADING',      'LEGENDARY', 5000,'{"totalTrades":1000}'),
  ('winrate_60',        'Positive Edge',          'Achieve 60% win rate over 20+ trades',               '📈',  'TRADING',      'UNCOMMON',  300, '{"winRate":0.6,"minTrades":20}'),
  ('winrate_70',        'Sharp Shooter',          'Achieve 70% win rate over 30+ trades',               '🎯',  'TRADING',      'RARE',      750, '{"winRate":0.7,"minTrades":30}'),
  ('winrate_80',        'Elite Marksman',         'Achieve 80% win rate over 50+ trades',               '🌟',  'TRADING',      'EPIC',      2000,'{"winRate":0.8,"minTrades":50}'),
  ('rr_2',              'Risk Master',            'Average R:R ratio above 2.0',                        '⚖️',  'RISK',         'UNCOMMON',  400, '{"avgRR":2.0}'),
  ('rr_3',              'Risk Perfectionist',     'Average R:R ratio above 3.0',                        '💎',  'RISK',         'EPIC',      1200,'{"avgRR":3.0}'),
  ('streak_5',          'On Fire',                '5-day trading streak',                               '🔥',  'CONSISTENCY',  'COMMON',    150, '{"streak":5}'),
  ('streak_14',         'Two Weeks Strong',       '14-day trading streak',                              '💪',  'CONSISTENCY',  'UNCOMMON',  400, '{"streak":14}'),
  ('streak_30',         'Monthly Warrior',        '30-day trading streak',                              '🛡️',  'CONSISTENCY',  'RARE',      1000,'{"streak":30}'),
  ('streak_90',         'Iron Discipline',        '90-day trading streak',                              '⚙️',  'CONSISTENCY',  'LEGENDARY', 4000,'{"streak":90}'),
  ('pnl_1k',            'First Thousand',         'Reach $1 000 total PnL',                             '💵',  'MILESTONE',    'COMMON',    200, '{"totalPnl":1000}'),
  ('pnl_10k',           'Five Figures',           'Reach $10 000 total PnL',                            '💰',  'MILESTONE',    'RARE',      800, '{"totalPnl":10000}'),
  ('pnl_100k',          'Six Figures',            'Reach $100 000 total PnL',                           '🚀',  'MILESTONE',    'LEGENDARY', 5000,'{"totalPnl":100000}'),
  ('referral_1',        'Connector',              'Refer your first user',                              '🤝',  'SOCIAL',       'COMMON',    250, '{"referrals":1}'),
  ('referral_5',        'Influencer',             'Refer 5 users',                                      '📣',  'SOCIAL',       'UNCOMMON',  750, '{"referrals":5}')
ON CONFLICT (id) DO NOTHING;
