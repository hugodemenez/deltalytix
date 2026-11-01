import { describe, expect, it } from "vitest"
import {
  buildTradeWhere,
  dateFilterBound,
  decodeCursor,
  encodeCursor,
  filterAndSortTradesByEntryDate,
  invalidDateFilter,
  parseStoredTradeDate,
  tradeMatchesDateRange,
} from "./pagination"

describe("decodeCursor", () => {
  it("round-trips an offset", () => {
    expect(decodeCursor(encodeCursor(200))).toBe(200)
  })

  it("rejects a non-integer offset", () => {
    const cursor = Buffer.from(JSON.stringify({ o: 1.5 })).toString("base64url")
    expect(decodeCursor(cursor)).toBe(0)
  })
})

describe("trade date filters", () => {
  it("includes the whole `to` day for ISO and legacy month-first dates", () => {
    const from = dateFilterBound("2024-01-31", "from")
    const to = dateFilterBound("2024-01-31", "to")

    expect(tradeMatchesDateRange("2024-01-31T23:59:00+00:00", from, to)).toBe(true)
    expect(tradeMatchesDateRange("01/31/2024 23:59:00", from, to)).toBe(true)
    expect(tradeMatchesDateRange("2024-02-01T00:00:00+00:00", from, to)).toBe(false)
  })

  it("rolls `to` over month ends", () => {
    const bound = dateFilterBound("2024-02-29", "to")
    expect(bound?.toISOString()).toBe("2024-03-01T00:00:00.000Z")
  })

  it("flags values that do not parse", () => {
    expect(invalidDateFilter(new URLSearchParams("to=yesterday"))).toBe("to")
    expect(invalidDateFilter(new URLSearchParams("from=2024-01-01"))).toBeNull()
  })

  it("keeps date range out of the Prisma where clause", () => {
    const where = buildTradeWhere("u1", {
      from: "2024-01-31",
      to: "2024-01-31",
      accountNumber: "A1",
    })
    expect(where).toEqual({ userId: "u1", accountNumber: "A1" })
    expect(where.entryDate).toBeUndefined()
  })
})

describe("filterAndSortTradesByEntryDate", () => {
  const trades = [
    { id: "iso-early", entryDate: "2025-02-17T10:00:00.000Z" },
    { id: "slash-mid", entryDate: "02/18/2025 11:01:49" },
    { id: "iso-late", entryDate: "2025-02-19T09:00:00.000Z" },
    { id: "slash-late", entryDate: "02/20/2025 08:00:00" },
  ]

  it("includes legacy month-first dates inside from/to", () => {
    const page = filterAndSortTradesByEntryDate(trades, {
      from: "2025-02-18",
      to: "2025-02-18",
    })
    expect(page.map((t) => t.id)).toEqual(["slash-mid"])
  })

  it("sorts by parsed instant, not lexicographic string order", () => {
    // Lexicographic desc would put ISO (`2…`) before slash (`0…`).
    const page = filterAndSortTradesByEntryDate(trades, {})
    expect(page.map((t) => t.id)).toEqual([
      "slash-late",
      "iso-late",
      "slash-mid",
      "iso-early",
    ])
  })

  it("parses the known legacy sample to the expected UTC day", () => {
    const parsed = parseStoredTradeDate("02/18/2025 11:01:49")
    expect(parsed?.toISOString()).toBe("2025-02-18T11:01:49.000Z")
  })
})

describe("buildTradeWhere", () => {
  it("always binds the token user and refuses a blank id", () => {
    expect(buildTradeWhere("user_a", { accountNumber: "B-1" })).toEqual({
      userId: "user_a",
      accountNumber: "B-1",
    })
    expect(() => buildTradeWhere("  ", {})).toThrow(/user id/)
  })
})
