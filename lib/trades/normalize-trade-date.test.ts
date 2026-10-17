import { describe, expect, it } from "vitest"
import {
  CANONICAL_TRADE_DATE_RE,
  normalizeTradeDate,
  normalizeTradeDates,
} from "./normalize-trade-date"

describe("normalizeTradeDate", () => {
  // One case per shape found in production Trade.entryDate / closeDate.
  it.each([
    // Canonical (majority of recent rows) is kept as is.
    ["2025-03-04T15:51:54.123+00:00", "2025-03-04T15:51:54.123+00:00"],
    // +00:00 without millis (older ATAS / Tradovate CSV rows).
    ["2024-07-31T15:51:54+00:00", "2024-07-31T15:51:54.000+00:00"],
    // toISOString() with Z (NinjaTrader, Rithmic performance, FTMO, seeds).
    ["2004-06-24T10:00:00.000Z", "2004-06-24T10:00:00.000+00:00"],
    ["2020-01-01T23:00:12Z", "2020-01-01T23:00:12.000+00:00"],
    // Non-UTC offsets are converted to UTC.
    ["2025-12-18T13:33:24-06:00", "2025-12-18T19:33:24.000+00:00"],
    ["2025-07-15T16:01:09+02:00", "2025-07-15T14:01:09.000+00:00"],
    ["2025-07-15T16:01:09+0200", "2025-07-15T14:01:09.000+00:00"],
    // No zone: read as UTC.
    ["2025-01-06T09:27:44", "2025-01-06T09:27:44.000+00:00"],
    ["2024-01-14 22:10:37", "2024-01-14T22:10:37.000+00:00"],
    ["2025-02-18 3:02:06", "2025-02-18T03:02:06.000+00:00"],
    ["2025-02-18 03:02", "2025-02-18T03:02:00.000+00:00"],
    // Bare date: UTC midnight.
    ["2026-01-13", "2026-01-13T00:00:00.000+00:00"],
    // Extra fractional precision is truncated to millis.
    ["2025-01-06T09:27:44.123456Z", "2025-01-06T09:27:44.123+00:00"],
    // Surrounding whitespace.
    ["  2025-01-06T09:27:44Z ", "2025-01-06T09:27:44.000+00:00"],
  ])("%s -> %s", (input, expected) => {
    const result = normalizeTradeDate(input)
    expect(result).toBe(expected)
    expect(result).toMatch(CANONICAL_TRADE_DATE_RE)
  })

  it.each([
    // Slash dates are ambiguous (mm/dd vs dd/mm both exist in production).
    ["02/18/2025 11:01:49"],
    ["21/03/2025 17:30:08 +01:00"],
    ["10/09/2024 13:45:17 +00:00"],
    // Garbage years written by earlier parser bugs.
    ["+040442-03-31T18:30:00.000Z"],
    ["0142-12-31T18:06:32.000Z"],
    ["0000-12-31T21:35:16.000+00:00"],
    // Empty / non-string / impossible calendar values.
    [""],
    ["   "],
    ["not a date"],
    ["2025-02-30T10:00:00Z"],
    ["2025-13-01T10:00:00Z"],
    ["2025-01-01T24:00:00Z"],
    ["2025-01-01T10:00:00+15:00"],
    [null],
    [undefined],
    [1736155664000],
  ])("rejects %s", (input) => {
    expect(normalizeTradeDate(input)).toBeNull()
  })

  it("accepts Date objects", () => {
    expect(normalizeTradeDate(new Date("2025-01-06T09:27:44.5Z"))).toBe(
      "2025-01-06T09:27:44.500+00:00",
    )
    expect(normalizeTradeDate(new Date("invalid"))).toBeNull()
  })

  it("keeps canonical output lexicographically ordered like the instants", () => {
    const inputs = [
      "2025-12-18T13:33:24-06:00", // 19:33Z
      "2025-12-18T19:00:00Z",
      "2025-12-18 20:00:00",
      "2025-12-18T21:00:00+02:00", // 19:00Z
    ]
    const normalized = inputs.map((v) => normalizeTradeDate(v) as string)
    const byString = [...normalized].sort()
    const byInstant = [...normalized].sort(
      (a, b) => Date.parse(a) - Date.parse(b),
    )
    expect(byString).toEqual(byInstant)
  })
})

describe("normalizeTradeDates", () => {
  it("rewrites both fields and leaves other fields alone", () => {
    const result = normalizeTradeDates([
      { id: "a", entryDate: "2024-01-14 22:06:00", closeDate: "2024-01-14T22:10:37Z" },
    ])
    expect(result).toEqual({
      ok: true,
      trades: [
        {
          id: "a",
          entryDate: "2024-01-14T22:06:00.000+00:00",
          closeDate: "2024-01-14T22:10:37.000+00:00",
        },
      ],
    })
  })

  it("reports every unreadable value with its index and field", () => {
    const result = normalizeTradeDates([
      { entryDate: "2025-01-06T09:27:44Z", closeDate: "2025-01-06T09:30:00Z" },
      { entryDate: "02/18/2025 11:01:49", closeDate: "" },
    ])
    expect(result).toEqual({
      ok: false,
      issues: [
        { index: 1, field: "entryDate", value: "02/18/2025 11:01:49" },
        { index: 1, field: "closeDate", value: "" },
      ],
    })
  })
})
