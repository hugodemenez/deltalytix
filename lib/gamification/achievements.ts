/**
 * Achievement catalogue — single source of truth.
 * Mirrors the DB seed in prisma/migrations/phase5_gamification.sql
 */

export type AchievementCategory = 'TRADING' | 'CONSISTENCY' | 'RISK' | 'SOCIAL' | 'MILESTONE'
export type AchievementRarity   = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'

export interface AchievementDef {
  id:          string
  title:       string
  description: string
  icon:        string
  category:    AchievementCategory
  rarity:      AchievementRarity
  xp:          number
  condition:   Record<string, number>
}

export const RARITY_COLOR: Record<AchievementRarity, string> = {
  COMMON:    'text-slate-400  border-slate-300  bg-slate-50   dark:bg-slate-900/30',
  UNCOMMON:  'text-green-500  border-green-400  bg-green-50   dark:bg-green-900/30',
  RARE:      'text-blue-500   border-blue-400   bg-blue-50    dark:bg-blue-900/30',
  EPIC:      'text-purple-500 border-purple-400 bg-purple-50  dark:bg-purple-900/30',
  LEGENDARY: 'text-amber-500  border-amber-400  bg-amber-50   dark:bg-amber-900/30',
}

export const RARITY_LABEL: Record<AchievementRarity, string> = {
  COMMON:    'Common',
  UNCOMMON:  'Uncommon',
  RARE:      'Rare',
  EPIC:      'Epic',
  LEGENDARY: 'Legendary',
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id:'first_trade',  title:'First Blood',          description:'Complete your first trade',                    icon:'⚔️',  category:'TRADING',     rarity:'COMMON',    xp:50,   condition:{totalTrades:1} },
  { id:'trades_10',    title:'Getting Started',       description:'Complete 10 trades',                           icon:'🔟',  category:'TRADING',     rarity:'COMMON',    xp:100,  condition:{totalTrades:10} },
  { id:'trades_50',    title:'Experienced Trader',    description:'Complete 50 trades',                           icon:'📊',  category:'TRADING',     rarity:'UNCOMMON',  xp:250,  condition:{totalTrades:50} },
  { id:'trades_100',   title:'Century Club',          description:'Complete 100 trades',                          icon:'💯',  category:'TRADING',     rarity:'RARE',      xp:500,  condition:{totalTrades:100} },
  { id:'trades_500',   title:'Trading Machine',       description:'Complete 500 trades',                          icon:'🤖',  category:'TRADING',     rarity:'EPIC',      xp:1500, condition:{totalTrades:500} },
  { id:'trades_1000',  title:'The Legend',            description:'Complete 1 000 trades',                        icon:'🏆',  category:'TRADING',     rarity:'LEGENDARY', xp:5000, condition:{totalTrades:1000} },
  { id:'winrate_60',   title:'Positive Edge',         description:'Achieve 60% win rate over 20+ trades',         icon:'📈',  category:'TRADING',     rarity:'UNCOMMON',  xp:300,  condition:{winRate:0.6,minTrades:20} },
  { id:'winrate_70',   title:'Sharp Shooter',         description:'Achieve 70% win rate over 30+ trades',         icon:'🎯',  category:'TRADING',     rarity:'RARE',      xp:750,  condition:{winRate:0.7,minTrades:30} },
  { id:'winrate_80',   title:'Elite Marksman',        description:'Achieve 80% win rate over 50+ trades',         icon:'🌟',  category:'TRADING',     rarity:'EPIC',      xp:2000, condition:{winRate:0.8,minTrades:50} },
  { id:'rr_2',         title:'Risk Master',           description:'Average R:R ratio above 2.0',                  icon:'⚖️',  category:'RISK',        rarity:'UNCOMMON',  xp:400,  condition:{avgRR:2.0} },
  { id:'rr_3',         title:'Risk Perfectionist',    description:'Average R:R ratio above 3.0',                  icon:'💎',  category:'RISK',        rarity:'EPIC',      xp:1200, condition:{avgRR:3.0} },
  { id:'streak_5',     title:'On Fire',               description:'5-day trading streak',                         icon:'🔥',  category:'CONSISTENCY', rarity:'COMMON',    xp:150,  condition:{streak:5} },
  { id:'streak_14',    title:'Two Weeks Strong',      description:'14-day trading streak',                        icon:'💪',  category:'CONSISTENCY', rarity:'UNCOMMON',  xp:400,  condition:{streak:14} },
  { id:'streak_30',    title:'Monthly Warrior',       description:'30-day trading streak',                        icon:'🛡️',  category:'CONSISTENCY', rarity:'RARE',      xp:1000, condition:{streak:30} },
  { id:'streak_90',    title:'Iron Discipline',       description:'90-day trading streak',                        icon:'⚙️',  category:'CONSISTENCY', rarity:'LEGENDARY', xp:4000, condition:{streak:90} },
  { id:'pnl_1k',       title:'First Thousand',        description:'Reach $1 000 total PnL',                       icon:'💵',  category:'MILESTONE',   rarity:'COMMON',    xp:200,  condition:{totalPnl:1000} },
  { id:'pnl_10k',      title:'Five Figures',          description:'Reach $10 000 total PnL',                      icon:'💰',  category:'MILESTONE',   rarity:'RARE',      xp:800,  condition:{totalPnl:10000} },
  { id:'pnl_100k',     title:'Six Figures',           description:'Reach $100 000 total PnL',                     icon:'🚀',  category:'MILESTONE',   rarity:'LEGENDARY', xp:5000, condition:{totalPnl:100000} },
  { id:'referral_1',   title:'Connector',             description:'Refer your first user',                        icon:'🤝',  category:'SOCIAL',      rarity:'COMMON',    xp:250,  condition:{referrals:1} },
  { id:'referral_5',   title:'Influencer',            description:'Refer 5 users',                                icon:'📣',  category:'SOCIAL',      rarity:'UNCOMMON',  xp:750,  condition:{referrals:5} },
]

export const ACHIEVEMENTS_MAP = new Map(ACHIEVEMENTS.map(a => [a.id, a]))
