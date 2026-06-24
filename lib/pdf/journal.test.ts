import { describe, expect, it } from "vitest"
import {
  clampJournalText,
  MAX_JOURNAL_TEXT_LENGTH,
  parseDateKey,
  sanitizeJournalEntries,
  sortJournalEntries,
} from "./journal"

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

  it("sorts entries chronologically", () => {
    expect(
      sortJournalEntries([
        { date: "2026-06-08", emotionValue: 50, selectedNewsCount: 0, journalText: "b" },
        { date: "2026-06-06", emotionValue: 40, selectedNewsCount: 1, journalText: "a" },
      ]),
    ).toEqual([
      { date: "2026-06-06", emotionValue: 40, selectedNewsCount: 1, journalText: "a" },
      { date: "2026-06-08", emotionValue: 50, selectedNewsCount: 0, journalText: "b" },
    ])
  })

  it("sanitizes and drops invalid entry dates", () => {
    expect(
      sanitizeJournalEntries([
        { date: "2026-06-06", emotionValue: 75, selectedNewsCount: 2, journalText: "Good day" },
        { date: "invalid", emotionValue: 10, selectedNewsCount: 0, journalText: "skip me" },
      ]),
    ).toEqual([
      { date: "2026-06-06", emotionValue: 75, selectedNewsCount: 2, journalText: "Good day" },
    ])
  })
})
