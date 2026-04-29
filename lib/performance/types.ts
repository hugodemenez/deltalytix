// ─── Phase 6: Performance Center — shared types ──────────────────────────────

export type PeriodType = 'week' | 'month' | 'quarter' | 'year' | 'custom'

export interface PeriodRange {
  type: PeriodType
  offset: number          // 0 = current, -1 = previous, etc.
  from?: string           // ISO date, for 'custom'
  to?: string             // ISO date, for 'custom'
}

// Win-rate breakdown slices
export interface WinRateByDimension {
  label: string
  trades: number
  wins: number
  losses: number
  winRate: number         // 0-1
  avgPnl: number
  totalPnl: number
}

export interface WinRateData {
  overall: WinRateByDimension
  byInstrument: WinRateByDimension[]
  byWeekday: WinRateByDimension[]
  byHour: WinRateByDimension[]
  bySide: WinRateByDimension[]
}

// MAE / MFE
export interface MaeMfePoint {
  tradeId: string
  instrument: string
  entryDate: string
  pnl: number
  mae: number             // Max Adverse Excursion (negative $)
  mfe: number             // Max Favorable Excursion (positive $)
  efficiency: number      // mfe > 0 ? pnl / mfe : 0
  riskRewardRatio: number
}

export interface MaeMfeData {
  points: MaeMfePoint[]
  avgMae: number
  avgMfe: number
  avgEfficiency: number
  avgRR: number
}

// Drawdown
export interface DrawdownPoint {
  date: string
  equity: number
  drawdown: number        // negative value from peak
  drawdownPct: number     // 0-1
}

export interface DrawdownData {
  points: DrawdownPoint[]
  maxDrawdown: number
  maxDrawdownPct: number
  longestDrawdownDays: number
  currentDrawdown: number
  peakEquity: number
  recoveryFactor: number  // totalPnl / |maxDrawdown|
}

// Period comparison
export interface PeriodStats {
  label: string
  trades: number
  winRate: number
  totalPnl: number
  avgPnl: number
  profitFactor: number
  avgRR: number
  maxDrawdown: number
  bestTrade: number
  worstTrade: number
}

export interface PeriodComparisonData {
  current: PeriodStats
  previous: PeriodStats
  delta: Record<keyof Omit<PeriodStats, 'label'>, number>  // % change
}

// Full response from /api/performance
export interface PerformanceData {
  period: PeriodRange
  winRate: WinRateData
  maeMfe: MaeMfeData
  drawdown: DrawdownData
  summary: PeriodStats
}
