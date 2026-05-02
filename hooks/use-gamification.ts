'use client'

import useSWR from 'swr'

export interface GamificationData {
  stats: {
    xp: number
    level: number
    totalTrades: number
    winRate: number
    avgRR: number
    totalPnl: number
    currentStreak: number
    bestStreak: number
  } | null
  achievements: Array<{
    achievementId: string
    earnedAt: string
  }>
  streak: {
    current: number
    longest: number
    lastActiveAt: string
  } | null
  leaderboard: Array<{
    rank: number
    userId: string
    xp: number
    level: number
    totalTrades: number
    winRate: number
  }>
}

async function fetchGamification(): Promise<GamificationData> {
  const res = await fetch('/api/gamification')
  if (!res.ok) throw new Error('Failed to fetch gamification data')
  return res.json()
}

export function useGamification() {
  const { data, error, isLoading, mutate } = useSWR<GamificationData>(
    '/api/gamification',
    fetchGamification,
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  )

  return {
    stats:        data?.stats        ?? null,
    achievements: data?.achievements ?? [],
    streak:       data?.streak       ?? null,
    leaderboard:  data?.leaderboard  ?? [],
    isLoading,
    error,
    mutate,
  }
}
