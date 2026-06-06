import type { PdfTrade } from "./statement"

export type JournalPdfLocale = "en" | "fr"

export const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
export const MAX_JOURNAL_TEXT_LENGTH = 50_000
export const MAX_JOURNAL_TRADES = 500
export const JOURNAL_EMOTION_MAX = 95

export interface ExportJournalPdfPayload {
  locale: JournalPdfLocale
  date: string
  emotionValue: number
  selectedNewsCount: number
  journalText: string
  trades: PdfTrade[]
}

export interface JournalSummary {
  tradesCount: number
  totalGrossPnl: number
  totalCommission: number
  totalNetPnl: number
}

export function parseDateKey(input: unknown): string | null {
  if (typeof input !== "string" || !DATE_KEY_PATTERN.test(input)) {
    return null
  }
  return input
}

export function clampJournalText(input: unknown): string {
  if (typeof input !== "string") {
    return ""
  }
  return input.slice(0, MAX_JOURNAL_TEXT_LENGTH)
}

export function computeJournalSummary(trades: PdfTrade[]): JournalSummary {
  const totalGrossPnl = trades.reduce((sum, trade) => sum + Number(trade.pnl || 0), 0)
  const totalCommission = trades.reduce((sum, trade) => sum + Number(trade.commission || 0), 0)
  return {
    tradesCount: trades.length,
    totalGrossPnl,
    totalCommission,
    totalNetPnl: totalGrossPnl - totalCommission,
  }
}
