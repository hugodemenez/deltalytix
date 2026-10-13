import { describe, expect, it } from "vitest"
import { parseTradezellaCsv } from "./tradezella"
import { parseTradovateCsv } from "./tradovate"

const TRADEZELLA_HEADERS = [
  "Account Name",
  "Symbol",
  "Side",
  "Quantity",
  "Entry Price",
  "Exit Price",
  "Open Date",
  "Open Time",
  "Close Date",
  "Close Time",
  "Gross P&L",
  "Commission",
  "Duration",
  "Adjusted Cost",
  "Adjusted Proceeds",
]

function tradezellaRow(overrides: Partial<Record<string, string>> = {}) {
  const values: Record<string, string> = {
    "Account Name": "ACC-1",
    Symbol: "ES",
    Side: "Long",
    Quantity: "1",
    "Entry Price": "5000",
    "Exit Price": "5001",
    "Open Date": "2024-01-02",
    "Open Time": "09:30:00",
    "Close Date": "2024-01-02",
    "Close Time": "09:45:00",
    "Gross P&L": "50",
    Commission: "2",
    Duration: "900",
    "Adjusted Cost": "1",
    "Adjusted Proceeds": "2",
    ...overrides,
  }
  return TRADEZELLA_HEADERS.map((h) => values[h])
}

describe("parseTradezellaCsv", () => {
  it("accepts XLSX date and time cells that arrive as ISO strings", () => {
    const trades = parseTradezellaCsv(
      TRADEZELLA_HEADERS,
      [
        tradezellaRow({
          "Open Date": "2024-01-02T00:00:00.000Z",
          "Open Time": "1899-12-30T09:30:00.000Z",
          "Close Date": "2024-01-02T00:00:00.000Z",
          "Close Time": "1899-12-30T09:45:00.000Z",
        }),
      ],
      "ACC-1",
    )

    expect(trades).toHaveLength(1)
    expect(Number.isNaN(new Date(trades[0].entryDate).getTime())).toBe(false)
  })

  it("skips a row whose date does not parse instead of throwing", () => {
    expect(() =>
      parseTradezellaCsv(
        TRADEZELLA_HEADERS,
        [tradezellaRow({ "Open Date": "" }), tradezellaRow()],
        "ACC-1",
      ),
    ).not.toThrow()
    expect(
      parseTradezellaCsv(
        TRADEZELLA_HEADERS,
        [tradezellaRow({ "Open Date": "" }), tradezellaRow()],
        "ACC-1",
      ),
    ).toHaveLength(1)
  })
})

const TRADOVATE_HEADERS = [
  "symbol",
  "qty",
  "pnl",
  "duration",
  "buyFillId",
  "buyPrice",
  "boughtTimestamp",
  "sellFillId",
  "sellPrice",
  "soldTimestamp",
]

describe("parseTradovateCsv", () => {
  it("matches the dashboard processor on a short round trip", () => {
    const [trade] = parseTradovateCsv(
      TRADOVATE_HEADERS,
      [
        [
          "ESZ4",
          "1",
          "$50.00",
          "15min 0sec",
          "111",
          "5000",
          "01/02/2024 10:00:00",
          "222",
          "5001",
          "01/02/2024 09:45:00",
        ],
      ],
      "ACC-1",
    )

    expect(trade.instrument).toBe("ES")
    expect(trade.side).not.toBe("")
    expect(trade.tags).toContain("tradovate")
    // Sold first: the sell is the entry, the buy is the exit.
    expect(trade.entryPrice).toBe("5001")
    expect(trade.closePrice).toBe("5000")
    expect(new Date(trade.entryDate).getTime()).toBeLessThan(
      new Date(trade.closeDate).getTime(),
    )
  })
})
