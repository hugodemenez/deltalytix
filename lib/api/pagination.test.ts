import { describe, expect, it } from "vitest"
import {
  buildTradeWhere,
  dateFilterBound,
  decodeCursor,
  encodeCursor,
  invalidDateFilter,
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
  it("includes the whole `to` day", () => {
    const where = buildTradeWhere("u1", { from: "2024-01-31", to: "2024-01-31" })
    const range = where.entryDate as { gte: string; lt: string }
    const lastTrade = "2024-01-31T23:59:00+00:00"

    expect(lastTrade >= range.gte).toBe(true)
    expect(lastTrade < range.lt).toBe(true)
    expect("2024-02-01T00:00:00+00:00" < range.lt).toBe(false)
  })

  it("rolls `to` over month ends", () => {
    expect(dateFilterBound("2024-02-29", "to")).toBe("2024-03-01")
  })

  it("flags values that do not parse", () => {
    expect(invalidDateFilter(new URLSearchParams("to=yesterday"))).toBe("to")
    expect(invalidDateFilter(new URLSearchParams("from=2024-01-01"))).toBeNull()
  })
})
