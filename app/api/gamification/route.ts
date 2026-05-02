import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { getLeaderboard, popNewAchievements } from '@/server/gamification/actions'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [stats, achievements, streak, leaderboard] = await Promise.all([
      prisma.userStats.findUnique({ where: { userId: user.id } }),
      prisma.userAchievement.findMany({
        where:   { userId: user.id },
        select:  { achievementId: true, earnedAt: true },
        orderBy: { earnedAt: 'desc' },
      }),
      prisma.streak.findUnique({ where: { userId: user.id } }),
      getLeaderboard(20),
    ])

    return NextResponse.json({ stats, achievements, streak, leaderboard })
  } catch (err) {
    console.error('[gamification GET]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/**
 * POST /api/gamification
 * Returns newly unlocked achievements (notified=false) and marks them as notified.
 * Called by GamificationProvider on mount.
 */
export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const fresh = await popNewAchievements(user.id)
    return NextResponse.json({ achievements: fresh })
  } catch (err) {
    console.error('[gamification POST]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
