import { describe, expect, it } from "vitest"
import {
  clampJournalText,
  computeJournalSummary,
  MAX_JOURNAL_TEXT_LENGTH,
  parseDateKey,
} from "./journal"
import type { PdfTrade } from "./statement"

describe("journal PDF helpers", () => {
  it("accepts valid yyyy-MM-dd date keys", () => {
    expect(parseDateKey("2026-06-06")).toBe("2026-06-06")
  })

  it("rejects crafted date header values", () => {
    expect(parseDateKey('2026-06-06"\nEvil: true')).toBeNull()
    expect(parseDateKey("06-06-2026")).toBeNull()
    expect(parseDateKey("")).toBeNull()
  })

  it("clamps journal text length", () => {
    const longText = "a".repeat(MAX_JOURNAL_TEXT_LENGTH + 10)
    expect(clampJournalText(longText)).toHaveLength(MAX_JOURNAL_TEXT_LENGTH)
  })

  it("computes gross, commission, and net totals", () => {
    const trades: PdfTrade[] = [
      {
        entryDate: "2026-06-06T10:00:00.000Z",
        closeDate: null,
        pnl: 100,
        commission: 10,
        accountNumber: "A1",
        side: "long",
        quantity: 1,
        instrument: "ES",
        timeInPosition: 60,
      },
      {
        entryDate: "2026-06-06T11:00:00.000Z",
        closeDate: null,
        pnl: -50,
        commission: 5,
        accountNumber: "A1",
        side: "short",
        quantity: 1,
        instrument: "NQ",
        timeInPosition: 30,
      },
    ]

    expect(computeJournalSummary(trades)).toEqual({
      tradesCount: 2,
      totalGrossPnl: 50,
      totalCommission: 15,
      totalNetPnl: 35,
    })
  })
})
