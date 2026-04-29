'use server'

import { prisma } from '@/lib/prisma'
import { ACHIEVEMENTS, ACHIEVEMENTS_MAP, AchievementDef } from '@/lib/gamification/achievements'
import { levelFromXP, XP_PER_TRADE_WIN, XP_PER_TRADE_LOSS, XP_LOGIN_STREAK } from '@/lib/gamification/xp'

/**
 * Recalculate UserStats for a user after trades change.
 * Called from trade import / sync flows.
 */
export async function recalcUserStats(userId: string) {
  // 1. Pull all trades for user
  const accounts = await prisma.account.findMany({
    where: { userId },
    select: { number: true },
  })
  const accountNumbers = accounts.map(a => a.number)

  const trades = await prisma.trade.findMany({
    where: { accountNumber: { in: accountNumbers } },
    select: { pnl: true, commission: true, entryDate: true },
  })

  const totalTrades = trades.length
  const wins        = trades.filter(t => t.pnl - t.commission > 0).length
  const winRate     = totalTrades > 0 ? wins / totalTrades : 0
  const totalPnl    = trades.reduce((s, t) => s + t.pnl - t.commission, 0)

  // crude avg R:R using win/loss magnitudes
  const avgWin  = wins > 0 ? trades.filter(t => t.pnl - t.commission > 0).reduce((s, t) => s + t.pnl - t.commission, 0) / wins : 0
  const losses  = totalTrades - wins
  const avgLoss = losses > 0 ? Math.abs(trades.filter(t => t.pnl - t.commission <= 0).reduce((s, t) => s + t.pnl - t.commission, 0)) / losses : 1
  const avgRR   = avgLoss > 0 ? avgWin / avgLoss : 0

  // XP from trades
  const tradingXP = trades.reduce((s, t) =>
    s + (t.pnl - t.commission > 0 ? XP_PER_TRADE_WIN : XP_PER_TRADE_LOSS), 0)

  // streak XP
  const streak = await prisma.streak.findUnique({ where: { userId } })
  const streakXP = (streak?.current ?? 0) * XP_LOGIN_STREAK

  const xp    = tradingXP + streakXP
  const level = levelFromXP(xp)

  await prisma.userStats.upsert({
    where:  { userId },
    update: { xp, level, totalTrades, winRate, avgRR, totalPnl, updatedAt: new Date() },
    create: { userId, xp, level, totalTrades, winRate, avgRR, totalPnl },
  })

  // 2. Check achievements
  await checkAndGrantAchievements(userId, { totalTrades, winRate, avgRR, totalPnl,
    streak: streak?.current ?? 0 })
}

/**
 * Update login streak (call on every authenticated dashboard load).
 */
export async function touchStreak(userId: string) {
  const today = new Date().toISOString().slice(0, 10)

  const existing = await prisma.streak.findUnique({ where: { userId } })
  if (!existing) {
    await prisma.streak.create({
      data: { userId, current: 1, longest: 1, lastActiveAt: new Date(today) }
    })
    return
  }

  const last = existing.lastActiveAt.toISOString().slice(0, 10)
  if (last === today) return  // already touched today

  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
  const continued  = last === yesterday
  const newCurrent = continued ? existing.current + 1 : 1
  const newLongest = Math.max(existing.longest, newCurrent)

  await prisma.streak.update({
    where: { userId },
    data:  { current: newCurrent, longest: newLongest, lastActiveAt: new Date(today), updatedAt: new Date() }
  })
}

/**
 * Check all achievements and grant newly unlocked ones.
 */
async function checkAndGrantAchievements(
  userId: string,
  stats: { totalTrades: number; winRate: number; avgRR: number; totalPnl: number; streak: number }
) {
  const earned = await prisma.userAchievement.findMany({
    where: { userId },
    select: { achievementId: true },
  })
  const earnedIds = new Set(earned.map(e => e.achievementId))

  // referral count
  const referral = await prisma.referral.findUnique({ where: { userId }, select: { referredUserIds: true } })
  const referrals = referral?.referredUserIds.length ?? 0

  for (const ach of ACHIEVEMENTS) {
    if (earnedIds.has(ach.id)) continue
    if (isUnlocked(ach, { ...stats, referrals })) {
      await grantAchievement(userId, ach.id)
    }
  }
}

function isUnlocked(
  ach: AchievementDef,
  stats: { totalTrades: number; winRate: number; avgRR: number; totalPnl: number; streak: number; referrals: number }
): boolean {
  const c = ach.condition
  if (c.totalTrades  !== undefined && stats.totalTrades  <  c.totalTrades)  return false
  if (c.winRate      !== undefined && stats.winRate      <  c.winRate)      return false
  if (c.minTrades    !== undefined && stats.totalTrades  <  c.minTrades)    return false
  if (c.avgRR        !== undefined && stats.avgRR        <  c.avgRR)        return false
  if (c.totalPnl     !== undefined && stats.totalPnl     <  c.totalPnl)     return false
  if (c.streak       !== undefined && stats.streak       <  c.streak)       return false
  if (c.referrals    !== undefined && stats.referrals    <  c.referrals)    return false
  return true
}

export async function grantAchievement(userId: string, achievementId: string) {
  const ach = ACHIEVEMENTS_MAP.get(achievementId)
  if (!ach) return

  await prisma.userAchievement.upsert({
    where:  { userId_achievementId: { userId, achievementId } },
    update: {},
    create: { userId, achievementId, notified: false },
  })

  // Add XP bonus
  await prisma.userStats.upsert({
    where:  { userId },
    update: { xp: { increment: ach.xp }, updatedAt: new Date() },
    create: { userId, xp: ach.xp, level: 1, totalTrades: 0, winRate: 0, avgRR: 0, totalPnl: 0 },
  })
}

/**
 * Fetch top-N leaderboard entries.
 */
export async function getLeaderboard(limit = 20) {
  const rows = await prisma.userStats.findMany({
    take:    limit,
    orderBy: { xp: 'desc' },
    include: { user: { select: { email: true } } },
  })
  return rows.map((r, i) => ({
    rank:        i + 1,
    userId:      r.userId,
    email:       r.user.email,
    xp:          r.xp,
    level:       r.level,
    totalTrades: r.totalTrades,
    winRate:     r.winRate,
  }))
}

/**
 * Get unnotified achievements for the current user and mark them notified.
 */
export async function popNewAchievements(userId: string) {
  const fresh = await prisma.userAchievement.findMany({
    where:  { userId, notified: false },
    include: { achievement: true },
  })
  if (fresh.length === 0) return []

  await prisma.userAchievement.updateMany({
    where: { userId, notified: false },
    data:  { notified: true },
  })

  return fresh.map(ua => ACHIEVEMENTS_MAP.get(ua.achievementId)!).filter(Boolean)
}
