import { describe, expect, it } from "vitest"
import {
  formatJournalDayPnl,
  journalCalendarDayModifiers,
  journalDayPnlPillClassName,
  journalDayPnlTone,
  journalMobileDateLabel,
  journalMobileDateLine,
  journalTimelineDateLabel,
} from "./journal-mobile-date"

function withRegularSpaces(value: string): string {
  return value.replace(/[\u00A0\u202F\u2009]/g, " ")
}

describe("journalMobileDateLine", () => {
  it("formats the French proof date with no trades", () => {
    expect(
      journalMobileDateLine(new Date(2026, 10, 3), 0, "fr", {
        none: "aucun trade",
        one: "1 trade",
        many: (count) => `${count} trades`,
      }),
    ).toBe("Mardi 3 novembre · aucun trade")
  })

  it("pluralizes English trade counts", () => {
    expect(
      journalMobileDateLine(new Date(2026, 10, 3), 4, "en", {
        none: "no trades",
        one: "1 trade",
        many: (count) => `${count} trades`,
      }),
    ).toBe("Tuesday 3 November · 4 trades")
  })
})

describe("journalMobileDateLabel", () => {
  it("capitalizes the French weekday for the date chip", () => {
    expect(journalMobileDateLabel(new Date(2026, 10, 4), "fr")).toBe(
      "Mercredi 4 novembre",
    )
  })
})

describe("journalTimelineDateLabel", () => {
  it("uses the short nav form, not the summary chip", () => {
    expect(journalTimelineDateLabel(new Date(2026, 10, 4), "fr")).toBe(
      "mer. 4 nov.",
    )
    expect(journalTimelineDateLabel(new Date(2026, 10, 4), "fr")).not.toContain(
      "Mercredi",
    )
  })
})

describe("journalDayPnlPillClassName", () => {
  it("never uses a bare .g class (Drop HTML clash with the calendar grid)", () => {
    expect(journalDayPnlPillClassName("positive")).not.toMatch(/\bg\b/)
    expect(journalDayPnlPillClassName("positive")).toContain("bg-green-100")
    expect(journalDayPnlPillClassName("negative")).toContain("bg-rose-100")
    expect(journalDayPnlPillClassName("flat")).toContain("bg-muted")
  })
})

describe("journalDayPnlTone", () => {
  it("uses the calendar 0.5-unit flat rule", () => {
    expect(journalDayPnlTone(1240)).toBe("positive")
    expect(journalDayPnlTone(-380)).toBe("negative")
    expect(journalDayPnlTone(0)).toBe("flat")
    expect(journalDayPnlTone(0.49)).toBe("flat")
    expect(journalDayPnlTone(-0.49)).toBe("flat")
    expect(journalDayPnlTone(0.5)).toBe("positive")
    expect(journalDayPnlTone(-0.5)).toBe("negative")
  })
})

describe("formatJournalDayPnl", () => {
  it("matches Drop's French P&L pill proofs", () => {
    expect(withRegularSpaces(formatJournalDayPnl(1240, "fr"))).toBe("+1 240 €")
    expect(withRegularSpaces(formatJournalDayPnl(-380, "fr"))).toBe("−380 €")
    expect(withRegularSpaces(formatJournalDayPnl(0, "fr"))).toBe("±0 €")
    expect(formatJournalDayPnl(-380, "fr")).toContain("\u2212")
    expect(formatJournalDayPnl(0, "fr")).toContain("\u00B1")
  })

  it("formats English locale currency without decimals", () => {
    expect(formatJournalDayPnl(1240, "en")).toBe("+$1,240")
    expect(formatJournalDayPnl(-380, "en")).toBe("−$380")
    expect(formatJournalDayPnl(0, "en")).toBe("±$0")
  })
})

describe("journalCalendarDayModifiers", () => {
  it("splits trade days by net sign (flat is exactly 0) and skips empty days", () => {
    const modifiers = journalCalendarDayModifiers({
      "2026-11-01": { pnl: 1240, tradeNumber: 3 },
      "2026-11-02": { pnl: -380, tradeNumber: 2 },
      "2026-11-03": { pnl: 0.2, tradeNumber: 2 },
      "2026-11-04": { pnl: 99, tradeNumber: 0 },
      "2026-11-05": { pnl: 0, tradeNumber: 1 },
      "not-a-date": { pnl: 10, tradeNumber: 1 },
    })

    expect(modifiers.green).toEqual([
      new Date(2026, 10, 1),
      new Date(2026, 10, 3),
    ])
    expect(modifiers.red).toEqual([new Date(2026, 10, 2)])
    expect(modifiers.flat).toEqual([new Date(2026, 10, 5)])
  })
})

