import { formatInTimeZone } from "date-fns-tz"
import {
  type BreakevenRange,
  DEFAULT_BREAKEVEN_RANGE,
  classifyTradeOutcome,
} from "@/types/breakeven"

// Slim trade shape the client sends to the PDF route. It mirrors the fields the
// dashboard's summary and charts actually read, so the server can reproduce the
// exact numbers the user is looking at without re-querying or re-filtering the
// database. Keeping the payload minimal also keeps the request small.
export interface PdfTrade {
  entryDate: string
  closeDate: string | null
  pnl: number
  commission: number
  accountNumber: string
  side: string | null
  quantity: number
  instrument: string
  timeInPosition: number
}

export type PdfLocale = "en" | "fr"

export interface ExportPdfPayload {
  locale: PdfLocale
  timezone: string
  title: string
  dateRange: { from: string | null; to: string | null } | null
  accountNumbers: string[]
  breakevenRange?: BreakevenRange
  trades: PdfTrade[]
}

export function sanitizeTrades(input: unknown): PdfTrade[] {
  if (!Array.isArray(input)) {
    return []
  }
  return input.map((raw) => {
    const trade = raw as Record<string, unknown>
    return {
      entryDate: String(trade.entryDate ?? ""),
      closeDate: trade.closeDate != null ? String(trade.closeDate) : null,
      pnl: Number(trade.pnl ?? 0),
      commission: Number(trade.commission ?? 0),
      accountNumber: String(trade.accountNumber ?? ""),
      side: trade.side != null ? String(trade.side) : null,
      quantity: Number(trade.quantity ?? 0),
      instrument: String(trade.instrument ?? ""),
      timeInPosition: Number(trade.timeInPosition ?? 0),
    }
  })
}

export interface SummaryMetrics {
  totalTrades: number
  winRate: number
  totalGrossPnl: number
  totalNetPnl: number
}

export interface PointSeries {
  label: string
  value: number
}

export interface StatementChartData {
  equity: PointSeries[]
  dailyPnl: PointSeries[]
  weekdayPnl: PointSeries[]
  distribution: { win: number; breakeven: number; loss: number }
}

const netPnl = (trade: PdfTrade) => Number(trade.pnl || 0) - Number(trade.commission || 0)

function computeTradeDistribution(
  trades: PdfTrade[],
  breakevenRange: BreakevenRange = DEFAULT_BREAKEVEN_RANGE,
): { win: number; breakeven: number; loss: number } {
  let win = 0
  let loss = 0
  let breakeven = 0
  for (const trade of trades) {
    const outcome = classifyTradeOutcome(netPnl(trade), breakevenRange)
    if (outcome === "win") {
      win += 1
    } else if (outcome === "loss") {
      loss += 1
    } else {
      breakeven += 1
    }
  }
  return { win, breakeven, loss }
}

// Mirrors calculateStatistics in lib/utils: win rate and distribution use net
// pnl with the user's configured breakeven range.
export function computeSummary(
  trades: PdfTrade[],
  breakevenRange: BreakevenRange = DEFAULT_BREAKEVEN_RANGE,
): SummaryMetrics {
  const totalGrossPnl = trades.reduce((sum, t) => sum + Number(t.pnl || 0), 0)
  const totalNetPnl = trades.reduce((sum, t) => sum + netPnl(t), 0)
  const { win } = computeTradeDistribution(trades, breakevenRange)
  const winRate = trades.length > 0 ? (win / trades.length) * 100 : 0
  return {
    totalTrades: trades.length,
    winRate,
    totalGrossPnl,
    totalNetPnl,
  }
}

// Buckets net pnl by day. The equity curve uses entryDate in the user's
// timezone (matching the live equity chart's client-side fallback).
function bucketByDay(
  trades: PdfTrade[],
  dateKey: "entryDate",
  timezone: string,
): Map<string, number> {
  const buckets = new Map<string, number>()
  for (const trade of trades) {
    const source = trade[dateKey]
    const time = new Date(source).getTime()
    if (Number.isNaN(time)) {
      continue
    }
    const day = formatInTimeZone(new Date(source), timezone, "yyyy-MM-dd")
    buckets.set(day, (buckets.get(day) ?? 0) + netPnl(trade))
  }
  return buckets
}

// Mirrors formatCalendarData in lib/utils: the live Daily P&L, Weekday P&L,
// and calendar widgets bucket trades by entryDate formatted in UTC.
function bucketByDashboardCalendarDay(trades: PdfTrade[]): Map<string, number> {
  const buckets = new Map<string, number>()
  for (const trade of trades) {
    const time = new Date(trade.entryDate).getTime()
    if (Number.isNaN(time)) {
      continue
    }
    const day = formatInTimeZone(new Date(trade.entryDate), "UTC", "yyyy-MM-dd")
    buckets.set(day, (buckets.get(day) ?? 0) + netPnl(trade))
  }
  return buckets
}

export function computeChartData(
  trades: PdfTrade[],
  timezone: string,
  breakevenRange: BreakevenRange = DEFAULT_BREAKEVEN_RANGE,
): StatementChartData {
  // Equity: cumulative net pnl per day, in chronological order.
  const equityBuckets = bucketByDay(trades, "entryDate", timezone)
  const equityDays = [...equityBuckets.keys()].sort()
  let cumulative = 0
  const equity: PointSeries[] = equityDays.map((day) => {
    cumulative += equityBuckets.get(day) ?? 0
    return { label: day, value: cumulative }
  })

  // Daily net pnl by dashboard calendar bucket, chronological.
  const dailyBuckets = bucketByDashboardCalendarDay(trades)
  const dailyDays = [...dailyBuckets.keys()].sort()
  const dailyPnl: PointSeries[] = dailyDays.map((day) => ({
    label: day,
    value: dailyBuckets.get(day) ?? 0,
  }))

  // Weekday: average of the daily buckets that fall on each weekday (matches
  // the weekday-pnl widget, which averages per calendar day with trades).
  const weekdayTotals = Array.from({ length: 7 }, () => ({ total: 0, count: 0 }))
  for (const day of dailyDays) {
    const weekday = new Date(`${day}T00:00:00Z`).getUTCDay()
    weekdayTotals[weekday].total += dailyBuckets.get(day) ?? 0
    weekdayTotals[weekday].count += 1
  }
  // Reorder to Mon..Sun for display.
  const order = [1, 2, 3, 4, 5, 6, 0]
  const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  const weekdayPnl: PointSeries[] = order.map((weekday, i) => {
    const { total, count } = weekdayTotals[weekday]
    return { label: weekdayLabels[i], value: count > 0 ? total / count : 0 }
  })

  const distribution = computeTradeDistribution(trades, breakevenRange)

  return { equity, dailyPnl, weekdayPnl, distribution }
}

// Resolve a localized date-range / account label for the PDF header, mirroring
// the client logic that fell back to the trades' own span when no global filter
// was set.
export function resolveHeaderLabels(
  payload: ExportPdfPayload,
  allTimeLabel: string,
  allAccountsLabel: string,
): { dateRangeLabel: string; accountLabel: string } {
  let from = payload.dateRange?.from ? new Date(payload.dateRange.from) : undefined
  let to = payload.dateRange?.to ? new Date(payload.dateRange.to) : undefined

  if (!from) {
    const timestamps = payload.trades
      .map((t) => new Date(t.entryDate).getTime())
      .filter((time) => !Number.isNaN(time))
    if (timestamps.length > 0) {
      from = new Date(Math.min(...timestamps))
      to = new Date(Math.max(...timestamps))
    }
  }

  const fmt = (d: Date) => formatInTimeZone(d, payload.timezone, "yyyy-MM-dd")
  const fromLabel = from ? fmt(from) : null
  const toLabel = to ? fmt(to) : null
  const dateRangeLabel = fromLabel
    ? toLabel && toLabel !== fromLabel
      ? `${fromLabel} - ${toLabel}`
      : fromLabel
    : allTimeLabel

  const accountLabel =
    payload.accountNumbers.length > 0 ? payload.accountNumbers.join(", ") : allAccountsLabel

  return { dateRangeLabel, accountLabel }
}
