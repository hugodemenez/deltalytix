'use server'

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

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
    date: string
    pnl: number
    weekday: number
  }[]
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

  const trades = await prisma.trade.findMany({
    where: {
      userId: user.id,
    },
  })

  // Keep the last 14 days of trades to ensure we have two full weeks
  const last14DaysTrades = trades.filter((trade) => {
    const tradeDate = new Date(trade.entryDate)
    const today = new Date()
    const diffTime = Math.abs(today.getTime() - tradeDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays <= 14
  })

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
    trades: last14DaysTrades
  }
}

export async function computeTradingStats(
  trades: UserData['trades'],
  language: string
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
    const date = tradeDate.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit'
    })
    
    const weekday = (tradeDate.getDay() + 6) % 7
    
    const existingEntry = acc.find(entry => entry.date === date)
    if (existingEntry) {
      existingEntry.pnl = Number((existingEntry.pnl + trade.pnl - trade.commission).toFixed(2))
    } else {
      acc.push({
        date,
        pnl: Number((trade.pnl - trade.commission).toFixed(2)),
        weekday
      })
    }
    return acc
  }, [] as { date: string, pnl: number, weekday: number }[])

  // Sort by date
  dailyPnL.sort((a, b) => {
    const [dayA, monthA] = a.date.split('/').map(Number)
    const [dayB, monthB] = b.date.split('/').map(Number)
    const currentYear = new Date().getFullYear()
    const dateObjA = new Date(currentYear, monthA - 1, dayA)
    const dateObjB = new Date(currentYear, monthB - 1, dayB)
    return dateObjA.getTime() - dateObjB.getTime()
  })

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