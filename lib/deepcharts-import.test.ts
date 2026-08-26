import { describe, expect, it } from "vitest"
import {
  DeepchartsImportError,
  parseDeepchartsTradeList,
} from "./deepcharts-import"

const headers = [
  "Symbol",
  "Quantity",
  "Entry DT",
  "Entry Price",
  "Exit DT",
  "Exit Price",
  "ProfitLoss",
]

describe("parseDeepchartsTradeList", () => {
  it("locks the first Hugo MNQ 2-lot closed trade at 469 cash P&L", () => {
    const result = parseDeepchartsTradeList(headers, [
      [
        "MNQ",
        "2",
        "2026-01-06 17:35:22",
        "25629.25",
        "2026-01-06 17:51:31.186",
        "25746.5",
        "469",
      ],
    ])

    expect(result.trades).toEqual([
      {
        instrument: "MNQ",
        quantity: 2,
        side: "long",
        entryPrice: "25629.25",
        closePrice: "25746.5",
        entryDate: "2026-01-06T17:35:22.000Z",
        closeDate: "2026-01-06T17:51:31.186Z",
        pnl: 469,
        commission: 0,
        timeInPosition: 969.186,
      },
    ])
  })

  it("uses a negative quantity for short side and keeps cash P&L as-is", () => {
    const result = parseDeepchartsTradeList(headers, [
      [
        "MNQ",
        "-2",
        "2026-01-06 18:14:14",
        "25756.5",
        "2026-01-06 18:26:22.417",
        "25778.5",
        "-88",
      ],
    ])

    expect(result.trades[0]).toEqual(
      expect.objectContaining({
        instrument: "MNQ",
        quantity: 2,
        side: "short",
        entryPrice: "25756.5",
        closePrice: "25778.5",
        pnl: -88,
        commission: 0,
      }),
    )
  })

  it("skips blank rows and still maps when required headers are reordered", () => {
    const reordered = [
      "ProfitLoss",
      "Exit Price",
      "Exit DT",
      "Entry Price",
      "Entry DT",
      "Quantity",
      "Symbol",
    ]
    const result = parseDeepchartsTradeList(reordered, [
      [],
      ["", "", "", "", "", "", ""],
      [
        "128",
        "25702.75",
        "2026-01-06 17:47:05.497",
        "25638.75",
        "2026-01-06 17:39:52",
        "1",
        "MNQ",
      ],
    ])

    expect(result.trades).toEqual([
      expect.objectContaining({
        instrument: "MNQ",
        quantity: 1,
        side: "long",
        pnl: 128,
        entryPrice: "25638.75",
        closePrice: "25702.75",
      }),
    ])
  })

  it("rejects files that are missing required DeepCharts columns", () => {
    expect(() => parseDeepchartsTradeList(["Symbol", "Quantity"], [])).toThrow(
      DeepchartsImportError,
    )

    try {
      parseDeepchartsTradeList(["Symbol", "Quantity"], [])
    } catch (error) {
      expect(error).toMatchObject({ code: "missing-columns" })
    }
  })
})
