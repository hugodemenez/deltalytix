import type { PdfTrade } from "./statement"

export type JournalPdfLocale = "en" | "fr"

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

export function sanitizeJournalTrades(input: unknown): PdfTrade[] {
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
