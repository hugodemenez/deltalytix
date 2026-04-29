// ─── Phase 6: Pure calculation helpers ───────────────────────────────────────
import { formatInTimeZone } from 'date-fns-tz'
import type {
  WinRateByDimension,
  WinRateData,
  DrawdownData,
  DrawdownPoint,
  PeriodStats,
} from './types'

export interface RawTrade {
  id: string
  instrument: string
  entryDate: string
  closeDate: string
  pnl: number
  commission: number
  side: string
  timeInPosition: number
}

const NET = (t: RawTrade) => t.pnl - t.commission

/**
 * Parse a UTC ISO date string and return the hour (0-23) in the given IANA timezone.
 * Falls back to UTC if the timezone is invalid.
 */
function getHourInTz(isoDate: string, timezone: string): number {
  try {
    return Number(formatInTimeZone(new Date(isoDate), timezone, 'H'))
  } catch {
    return new Date(isoDate).getUTCHours()
  }
}

/**
 * Parse a UTC ISO date string and return the ISO weekday (0=Mon … 6=Sun)
 * in the given IANA timezone.
 */
function getWeekdayInTz(isoDate: string, timezone: string): number {
  try {
    // 'e' in date-fns-tz: 1=Mon … 7=Sun → convert to 0-based Mon=0
    return (Number(formatInTimeZone(new Date(isoDate), timezone, 'e')) - 1 + 7) % 7
  } catch {
    return (new Date(isoDate).getUTCDay() + 6) % 7
  }
}

// ── Win-rate breakdown ────────────────────────────────────────────────────────

function toWinRateDimension(label: string, trades: RawTrade[]): WinRateByDimension {
  const wins = trades.filter(t => NET(t) > 0).length
  const totalPnl = trades.reduce((s, t) => s + NET(t), 0)
  return {
    label,
    trades: trades.length,
    wins,
    losses: trades.length - wins,
    winRate: trades.length > 0 ? wins / trades.length : 0,
    avgPnl: trades.length > 0 ? totalPnl / trades.length : 0,
    totalPnl,
  }
}

/**
 * @param trades  Raw trades for the period
 * @param timezone  IANA timezone string (e.g. "Europe/Moscow").
 *                  Defaults to 'UTC' when omitted so the function remains
 *                  backwards-compatible with tests that don't pass a timezone.
 */
export function computeWinRateData(trades: RawTrade[], timezone = 'UTC'): WinRateData {
  const overall = toWinRateDimension('Overall', trades)

  // By instrument
  const instrumentMap = new Map<string, RawTrade[]>()
  for (const t of trades) {
    const list = instrumentMap.get(t.instrument) ?? []
    list.push(t)
    instrumentMap.set(t.instrument, list)
  }
  const byInstrument = Array.from(instrumentMap.entries())
    .map(([label, ts]) => toWinRateDimension(label, ts))
    .sort((a, b) => b.trades - a.trades)

  // By weekday — use trader's local timezone so Mon/Tue/… reflect their session
  const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const weekdayMap = new Map<number, RawTrade[]>()
  for (const t of trades) {
    const dow = getWeekdayInTz(t.entryDate, timezone)
    const list = weekdayMap.get(dow) ?? []
    list.push(t)
    weekdayMap.set(dow, list)
  }
  const byWeekday = Array.from({ length: 7 }, (_, i) =>
    toWinRateDimension(WEEKDAYS[i], weekdayMap.get(i) ?? [])
  )

  // By hour of entry — use trader's local timezone
  const hourMap = new Map<number, RawTrade[]>()
  for (const t of trades) {
    const h = getHourInTz(t.entryDate, timezone)
    const list = hourMap.get(h) ?? []
    list.push(t)
    hourMap.set(h, list)
  }
  const byHour = Array.from(hourMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([h, ts]) => toWinRateDimension(`${String(h).padStart(2, '0')}:00`, ts))

  // By side
  const sideMap = new Map<string, RawTrade[]>()
  for (const t of trades) {
    const s = t.side || 'Unknown'
    const list = sideMap.get(s) ?? []
    list.push(t)
    sideMap.set(s, list)
  }
  const bySide = Array.from(sideMap.entries()).map(([label, ts]) => toWinRateDimension(label, ts))

  return { overall, byInstrument, byWeekday, byHour, bySide }
}

// ── Drawdown ──────────────────────────────────────────────────────────────────

export function computeDrawdown(trades: RawTrade[]): DrawdownData {
  if (trades.length === 0) {
    return { points: [], maxDrawdown: 0, maxDrawdownPct: 0, longestDrawdownDays: 0, currentDrawdown: 0, peakEquity: 0, recoveryFactor: 0 }
  }

  const sorted = [...trades].sort(
    (a, b) => new Date(a.closeDate).getTime() - new Date(b.closeDate).getTime()
  )

  let equity = 0
  let peak = 0
  let maxDd = 0
  let maxDdPct = 0
  let ddStartDate: Date | null = null
  let longestDd = 0

  const points: DrawdownPoint[] = []

  for (const t of sorted) {
    equity += NET(t)
    if (equity > peak) {
      if (ddStartDate) {
        const days = (new Date(t.closeDate).getTime() - ddStartDate.getTime()) / 86_400_000
        longestDd = Math.max(longestDd, days)
        ddStartDate = null
      }
      peak = equity
    }
    const dd = equity - peak
    const ddPct = peak > 0 ? dd / peak : 0
    if (dd < maxDd) {
      maxDd = dd
      maxDdPct = ddPct
      if (!ddStartDate) ddStartDate = new Date(t.closeDate)
    }
    points.push({
      date: t.closeDate,
      equity,
      drawdown: dd,
      drawdownPct: ddPct,
    })
  }

  const totalPnl = equity
  const recoveryFactor = maxDd < 0 ? totalPnl / Math.abs(maxDd) : 0

  return {
    points,
    maxDrawdown: maxDd,
    maxDrawdownPct: maxDdPct,
    longestDrawdownDays: longestDd,
    currentDrawdown: equity - peak,
    peakEquity: peak,
    recoveryFactor,
  }
}

// ── Period Stats ──────────────────────────────────────────────────────────────

export function computePeriodStats(label: string, trades: RawTrade[]): PeriodStats {
  if (trades.length === 0) {
    return { label, trades: 0, winRate: 0, totalPnl: 0, avgPnl: 0, profitFactor: 0, avgRR: 0, maxDrawdown: 0, bestTrade: 0, worstTrade: 0 }
  }
  const nets = trades.map(NET)
  const wins = nets.filter(n => n > 0)
  const losses = nets.filter(n => n <= 0)
  const totalPnl = nets.reduce((s, n) => s + n, 0)
  const grossWin = wins.reduce((s, n) => s + n, 0)
  const grossLoss = Math.abs(losses.reduce((s, n) => s + n, 0))
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0
  const avgWin = wins.length > 0 ? grossWin / wins.length : 0
  const avgLossAbs = losses.length > 0 ? grossLoss / losses.length : 1
  const avgRR = avgLossAbs > 0 ? avgWin / avgLossAbs : 0
  const dd = computeDrawdown(trades)
  return {
    label,
    trades: trades.length,
    winRate: wins.length / trades.length,
    totalPnl,
    avgPnl: totalPnl / trades.length,
    profitFactor,
    avgRR,
    maxDrawdown: dd.maxDrawdown,
    bestTrade: Math.max(...nets),
    worstTrade: Math.min(...nets),
  }
}
