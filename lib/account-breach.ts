import type { Trade as PrismaTrade } from '@/prisma/generated/prisma/browser'
import type { Account } from '@/context/data-provider'
import { computeDrawdownLevel } from '@/lib/account-drawdown'

export type AccountBreachDetection = {
  breachDate: Date | null
  firstPostBreachTradeDate: Date | null
  hasPostBreachTrades: boolean
  needsUserConfirmation: boolean
}

type BreachAccountInput = Pick<
  Account,
  | 'number'
  | 'startingBalance'
  | 'drawdownThreshold'
  | 'trailingDrawdown'
  | 'trailingStopProfit'
  | 'resetDate'
  | 'bursted'
  | 'breachDate'
>

function toDate(d: string | Date | null | undefined): Date | null {
  if (!d) return null
  const dt = d instanceof Date ? d : new Date(d)
  return Number.isNaN(dt.getTime()) ? null : dt
}

function toDateKey(d: string | Date | null | undefined): string | null {
  const dt = toDate(d)
  return dt ? dt.toISOString().split('T')[0] : null
}

function tradesInMetricsWindow(
  account: BreachAccountInput,
  trades: PrismaTrade[]
): PrismaTrade[] {
  const resetDate = toDate(account.resetDate)
  return trades
    .filter((trade) => trade.accountNumber === account.number)
    .filter((trade) => {
      const entryDate = toDate(trade.entryDate)
      if (!entryDate) return false
      return !resetDate || entryDate >= resetDate
    })
    .sort(
      (a, b) => toDate(a.entryDate)!.getTime() - toDate(b.entryDate)!.getTime()
    )
}

export function detectAccountBreach(
  account: BreachAccountInput,
  trades: PrismaTrade[]
): AccountBreachDetection {
  const empty: AccountBreachDetection = {
    breachDate: null,
    firstPostBreachTradeDate: null,
    hasPostBreachTrades: false,
    needsUserConfirmation: false,
  }

  if ((account.drawdownThreshold ?? 0) <= 0 || account.bursted) {
    return empty
  }

  const windowTrades = tradesInMetricsWindow(account, trades)
  if (windowTrades.length === 0) {
    return empty
  }

  const startingBalance = account.startingBalance || 0
  const drawdownThreshold = account.drawdownThreshold || 0
  let runningBalance = startingBalance
  let highestBalance = startingBalance
  let breachDate: Date | null = null
  let breachDateKey: string | null = null

  for (const trade of windowTrades) {
    const entryDate = toDate(trade.entryDate)!
    const pnl = trade.pnl - (trade.commission || 0)
    runningBalance += pnl
    highestBalance = Math.max(highestBalance, runningBalance)

    const drawdownLevel = computeDrawdownLevel({
      startingBalance,
      drawdownThreshold,
      trailingDrawdown: account.trailingDrawdown,
      trailingStopProfit: account.trailingStopProfit,
      highestBalance,
    })

    if (runningBalance < drawdownLevel) {
      breachDate = entryDate
      breachDateKey = toDateKey(entryDate)
      break
    }
  }

  if (!breachDate || !breachDateKey) {
    return empty
  }

  const firstPostBreachTrade = windowTrades.find((trade) => {
    const tradeDateKey = toDateKey(trade.entryDate)
    return tradeDateKey !== null && tradeDateKey > breachDateKey!
  })

  const firstPostBreachTradeDate = firstPostBreachTrade
    ? toDate(firstPostBreachTrade.entryDate)
    : null
  const hasPostBreachTrades = firstPostBreachTradeDate !== null

  const resetDateKey = toDateKey(account.resetDate)
  const firstPostBreachTradeDateKey = firstPostBreachTradeDate
    ? toDateKey(firstPostBreachTradeDate)
    : null
  const resetCoversPostBreach =
    resetDateKey !== null &&
    firstPostBreachTradeDateKey !== null &&
    resetDateKey >= firstPostBreachTradeDateKey

  return {
    breachDate,
    firstPostBreachTradeDate,
    hasPostBreachTrades,
    needsUserConfirmation: hasPostBreachTrades && !resetCoversPostBreach,
  }
}

export function filterTradesForBurstedAccount(
  account: Pick<Account, 'bursted' | 'breachDate' | 'number'>,
  trades: PrismaTrade[]
): PrismaTrade[] {
  if (!account.bursted || !account.breachDate) {
    return trades
  }

  const breachDateKey = toDateKey(account.breachDate)
  if (!breachDateKey) {
    return trades
  }

  return trades.filter((trade) => {
    if (trade.accountNumber !== account.number) return true
    const tradeDateKey = toDateKey(trade.entryDate)
    return tradeDateKey === null || tradeDateKey <= breachDateKey
  })
}
