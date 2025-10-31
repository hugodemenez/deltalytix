// Shared, environment-agnostic account metrics utilities
// These functions can be used on both server and client for consistent results.
import type { Trade as PrismaTrade } from '@prisma/client'
import type { Account } from '@/context/data-provider'

export type AccountMetrics = {
  // Balance and progress
  currentBalance: number
  remainingToTarget: number
  progress: number
  isConfigured: boolean

  // Drawdown metrics
  drawdownProgress: number
  remainingLoss: number
  highestBalance: number
  drawdownLevel: number

  // Consistency metrics
  totalProfit: number
  maxAllowedDailyProfit: number | null
  highestProfitDay: number
  isConsistent: boolean
  hasProfitableData: boolean
  dailyPnL: { [date: string]: number }
  totalProfitableDays: number

  // Trading days metrics
  totalTradingDays: number
  validTradingDays: number
}

export type DailyMetric = {
  date: Date
  pnl: number
  totalBalance: number
  percentageOfTarget: number
  isConsistent: boolean
  payout?: {
    id?: string
    amount: number
    date: Date
    status: string
  }
}

function toDate(d: string | Date | null | undefined): Date | null {
  if (!d) return null
  const dt = d instanceof Date ? d : new Date(d)
  return isNaN(dt.getTime()) ? null : dt
}

export function computeAccountMetrics(
  account: Account,
  allTrades: PrismaTrade[]
): { balanceToDate: number; metrics: NonNullable<Account['metrics']>; dailyMetrics: NonNullable<Account['dailyMetrics']> } {
  const resetDate = toDate(account.resetDate)
  const relevantTrades = allTrades.filter(t => {
    if (t.accountNumber !== account.number) return false
    const entryDate = toDate(t.entryDate)
    if (!entryDate) return false
    return !resetDate || entryDate >= resetDate
  })

  const sortedTrades = [...relevantTrades].sort((a, b) => {
    return (toDate(a.entryDate)!.getTime()) - (toDate(b.entryDate)!.getTime())
  })

  const dailyPnL: { [date: string]: number } = {}
  let totalProfit = 0
  for (const trade of relevantTrades) {
    const d = toDate(trade.entryDate)!
    const key = d.toISOString().split('T')[0]
    const pnl = trade.pnl - (trade.commission || 0)
    dailyPnL[key] = (dailyPnL[key] || 0) + pnl
    totalProfit += pnl
  }

  const hasProfitableData = totalProfit > 0
  const isConfigured = (account.profitTarget ?? 0) > 0 || (account.drawdownThreshold ?? 0) > 0
  const highestProfitDay = Object.values(dailyPnL).length > 0 ? Math.max(...Object.values(dailyPnL)) : 0

  let maxAllowedDailyProfit: number | null = null
  let isConsistent = false
  if (hasProfitableData && isConfigured && (account.consistencyPercentage ?? 0) > 0) {
    const target = account.profitTarget ?? 0
    const baseAmount = totalProfit <= target ? target : totalProfit
    maxAllowedDailyProfit = baseAmount * ((account.consistencyPercentage ?? 0) / 100)
    isConsistent = highestProfitDay <= maxAllowedDailyProfit
  }

  const validPayouts = (account.payouts || []).filter(p => ['PAID', 'VALIDATED'].includes(p.status))
  let runningBalance = account.startingBalance || 0
  let highestBalance = account.startingBalance || 0

  for (const trade of sortedTrades) {
    const pnl = trade.pnl - (trade.commission || 0)
    runningBalance += pnl
    if (runningBalance > highestBalance) highestBalance = runningBalance
  }
  const totalPayouts = validPayouts.reduce((s, p) => s + p.amount, 0)
  const currentBalance = runningBalance - totalPayouts

  let drawdownLevel: number
  if (account.trailingDrawdown) {
    const profitMade = Math.max(0, highestBalance - (account.startingBalance || 0))
    if (account.trailingStopProfit && profitMade >= account.trailingStopProfit) {
      drawdownLevel = ((account.startingBalance || 0) + account.trailingStopProfit) - (account.drawdownThreshold || 0)
    } else {
      drawdownLevel = highestBalance - (account.drawdownThreshold || 0)
    }
  } else {
    drawdownLevel = (account.startingBalance || 0) - (account.drawdownThreshold || 0)
  }
  const remainingLoss = Math.max(0, currentBalance - drawdownLevel)
  const dd = account.drawdownThreshold || 0
  const drawdownProgress = dd > 0 ? (((dd) - remainingLoss) / dd) * 100 : 0

  const currentProfit = currentBalance - (account.startingBalance || 0)
  const pt = account.profitTarget || 0
  const progress = pt > 0 ? (currentProfit / pt) * 100 : 0
  const remainingToTarget = pt > 0 ? Math.max(0, pt - currentProfit) : 0

  // Trading days metrics
  const dailyTrades: { [date: string]: PrismaTrade[] } = {}
  for (const trade of relevantTrades) {
    const key = toDate(trade.entryDate)!.toISOString().split('T')[0]
    if (!dailyTrades[key]) dailyTrades[key] = []
    dailyTrades[key].push(trade)
  }
  const totalTradingDays = Object.keys(dailyTrades).length
  const validTradingDays = Object.entries(dailyTrades).filter(([_, dayTrades]) => {
    const dayPnL = dayTrades.reduce((sum, t) => sum + (t.pnl - (t.commission || 0)), 0)
    return dayPnL >= (account.minPnlToCountAsDay || 0)
  }).length

  // Daily metrics (merge trade and payout dates)
  const allDates = new Set<string>()
  relevantTrades.forEach(t => allDates.add(toDate(t.entryDate)!.toISOString().split('T')[0]))
  ;(account.payouts || []).forEach(p => allDates.add(toDate(p.date)!.toISOString().split('T')[0]))

  let dailyRunningBalance = account.startingBalance || 0
  const dailyMetrics: NonNullable<Account['dailyMetrics']> = Array.from(allDates)
    .sort()
    .map(date => {
      const dailyTradesPnL = dailyPnL[date] || 0
      dailyRunningBalance += dailyTradesPnL

      const dayConsistent = totalProfit <= 0
        ? true
        : dailyTradesPnL <= (totalProfit * ((account.consistencyPercentage || 30) / 100))

      const payout = (account.payouts || []).find(p => toDate(p.date)!.toISOString().split('T')[0] === date)
      if (payout?.status === 'PAID') {
        dailyRunningBalance -= payout.amount
      }

      return {
        date: new Date(date),
        pnl: dailyTradesPnL,
        totalBalance: dailyRunningBalance,
        percentageOfTarget: pt > 0 ? (totalProfit / pt) * 100 : 0,
        isConsistent: dayConsistent,
        payout: payout ? {
          id: payout.id,
          amount: payout.amount,
          date: toDate(payout.date)!,
          status: payout.status
        } : undefined
      }
    }) as NonNullable<Account['dailyMetrics']>

  return {
    balanceToDate: currentBalance,
    metrics: {
      currentBalance,
      remainingToTarget,
      progress,
      isConfigured,
      drawdownProgress,
      remainingLoss,
      highestBalance,
      drawdownLevel,
      totalProfit,
      maxAllowedDailyProfit,
      highestProfitDay,
      isConsistent,
      hasProfitableData,
      dailyPnL,
      totalProfitableDays: Object.values(dailyPnL).filter(pnl => pnl > 0).length,
      totalTradingDays,
      validTradingDays,
    } as NonNullable<Account['metrics']>,
    dailyMetrics
  }
}

export function computeMetricsForAccounts(
  accounts: Account[],
  trades: PrismaTrade[]
): Account[] {
  return accounts.map(acc => {
    const computed = computeAccountMetrics(acc, trades)
    return {
      ...acc,
      balanceToDate: computed.balanceToDate,
      metrics: computed.metrics,
      dailyMetrics: computed.dailyMetrics,
    }
  })
}
