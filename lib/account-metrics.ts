// Shared, environment-agnostic account metrics utilities
// These functions can be used on both server and client for consistent results.
import type { Trade as PrismaTrade } from '@/prisma/generated/prisma/browser'
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
): { balanceToDate: number; metrics: NonNullable<Account['metrics']>; dailyMetrics: NonNullable<Account['dailyMetrics']>; trades: PrismaTrade[]; aboveBuffer: number } {
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

  // Apply buffer filtering if enabled (default to true)
  const considerBuffer = account.considerBuffer ?? true
  let filteredTrades = sortedTrades
  let aboveBuffer = 0
  if (considerBuffer && (account.buffer ?? 0) > 0) {
    // Build time-ordered event stream of trades and payouts (paid/validated)
    const validPayouts = (account.payouts || [])
      .filter(p => ['PAID', 'VALIDATED'].includes(p.status))
      .map(p => ({ date: toDate(p.date)!, amount: p.amount }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    type Event =
      | { kind: 'trade'; date: Date; pnl: number; trade: PrismaTrade }
      | { kind: 'payout'; date: Date; amount: number }

    const tradeEvents: Event[] = sortedTrades.map(tr => ({
      kind: 'trade',
      date: toDate(tr.entryDate)!,
      pnl: tr.pnl - (tr.commission || 0),
      trade: tr,
    }))
    const payoutEvents: Event[] = validPayouts.map(p => ({
      kind: 'payout',
      date: p.date,
      amount: p.amount,
    }))
    const events: Event[] = [...tradeEvents, ...payoutEvents].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    )

    const out: PrismaTrade[] = []
    let accProfit = 0 // accumulated profit since last baseline (reset/payouts effect included)
    const threshold = account.buffer || 0

    for (const ev of events) {
      if (ev.kind === 'payout') {
        // Payout reduces accumulated profit; can push us back under buffer
        accProfit -= ev.amount
        continue
      }

      const next = accProfit + ev.pnl
      const wasAbove = accProfit >= threshold
      const crossesNow = accProfit < threshold && next >= threshold
      if (wasAbove || crossesNow) {
        out.push(ev.trade)
      }
      accProfit = next
    }

    filteredTrades = out
    aboveBuffer = Math.max(0, accProfit - threshold)
  }

  const dailyPnL: { [date: string]: number } = {}
  let totalProfit = 0
  for (const trade of filteredTrades) {
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

  for (const trade of filteredTrades) {
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
  for (const trade of filteredTrades) {
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
  filteredTrades.forEach(t => allDates.add(toDate(t.entryDate)!.toISOString().split('T')[0]))
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
    dailyMetrics,
    trades: filteredTrades,
    aboveBuffer
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
      trades: computed.trades,
      aboveBuffer: computed.aboveBuffer,
    }
  })
}
