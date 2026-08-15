'use server'

import { PrismaClient } from "@/prisma/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import {
  getRecapWeekUtc,
  isEntryInWeek,
} from "@/lib/weekly-newsletter-window"

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})

const prisma = new PrismaClient({ adapter })

interface UserData {
  user: {
    id: string
    email: string
    language: string
  }
  newsletter: {
    email: string
    firstName: string | null
    isActive: boolean
  }
  trades: {
    id: string
    pnl: number
    commission: number
    entryDate: string
  }[]
}

interface ComputedStats {
  winLossStats: {
    wins: number
    losses: number
  }
  dailyPnL: {
    date: Date
    pnl: number
    weekday: number
  }[]
  /** Net PnL for the week: sum of (pnl − commission) per day */
  thisWeekPnL: number
  profitableDays: number
  totalDays: number
}

export async function getUserData(userId: string): Promise<UserData> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    throw new Error('User not found')
  }

  const newsletter = await prisma.newsletter.findUnique({
    where: { email: user.email },
  })

  if (!newsletter || !newsletter.isActive) {
    throw new Error(`Newsletter subscription not found or inactive for email: ${user.email}`)
  }

  // Monday–Sunday week the subscriber has just traded (UTC v1) — not a
  // rolling lookback, and not the week before it
  const week = getRecapWeekUtc()

  // Coarse pre-filter so the cron does not hold every trade a user has ever
  // made in memory (it now builds up to 100 recaps in one invocation).
  // `entryDate` is a String column written in several shapes across importers
  // — trailing `Z`, `+00:00`, and non-UTC offsets — so a lexicographic range
  // is not exactly a chronological one. Padding a day on each side absorbs any
  // UTC offset (max ±14h); `isEntryInWeek` below is still the real cut.
  const rangeStart = new Date(week.start)
  rangeStart.setUTCDate(rangeStart.getUTCDate() - 1)
  const rangeEnd = new Date(week.endExclusive)
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 1)

  const trades = await prisma.trade.findMany({
    where: {
      userId: user.id,
      entryDate: {
        gte: rangeStart.toISOString(),
        lt: rangeEnd.toISOString(),
      },
    },
  })

  const weekTrades = trades.filter((trade) => isEntryInWeek(trade.entryDate, week))

  return {
    user: {
      id: user.id,
      email: user.email,
      language: user.language
    },
    newsletter: {
      email: newsletter.email,
      firstName: newsletter.firstName,
      isActive: newsletter.isActive
    },
    trades: weekTrades
  }
}

export async function computeTradingStats(
  trades: UserData['trades'],
  _language: string
): Promise<ComputedStats> {
  if (trades.length === 0) {
    return {
      winLossStats: { wins: 0, losses: 0 },
      dailyPnL: [],
      thisWeekPnL: 0,
      profitableDays: 0,
      totalDays: 0
    }
  }

  const winLossStats = trades.reduce((acc, trade) => {
    if (trade.pnl > 0) {
      acc.wins++
    } else {
      acc.losses++
    }
    return acc
  }, { wins: 0, losses: 0 })

  const dailyPnL = trades.reduce((acc, trade) => {
    const tradeDate = new Date(trade.entryDate)
    // UTC midnight for date bucketing (UTC v1)
    const dayUtc = new Date(Date.UTC(
      tradeDate.getUTCFullYear(),
      tradeDate.getUTCMonth(),
      tradeDate.getUTCDate(),
    ))

    // Convert from Sunday-based (0-6) to Monday-based (0-6) weekday (UTC)
    const utcDay = dayUtc.getUTCDay()
    const weekday = utcDay === 0 ? 6 : utcDay - 1

    const existingEntry = acc.find(entry => entry.date.getTime() === dayUtc.getTime())

    if (existingEntry) {
      existingEntry.pnl = Number((existingEntry.pnl + trade.pnl - trade.commission).toFixed(2))
    } else {
      acc.push({
        date: dayUtc,
        pnl: Number((trade.pnl - trade.commission).toFixed(2)),
        weekday
      })
    }
    return acc
  }, [] as { date: Date, pnl: number, weekday: number }[])

  // Sort by date
  dailyPnL.sort((a, b) => a.date.getTime() - b.date.getTime())

  const thisWeekPnL = dailyPnL.reduce((sum, day) => sum + day.pnl, 0)
  const profitableDays = dailyPnL.filter(day => day.pnl > 0).length
  const totalDays = dailyPnL.length

  
  return {
    winLossStats,
    dailyPnL,
    thisWeekPnL,
    profitableDays,
    totalDays
  }
}
