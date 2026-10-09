import type { Trade } from "@/prisma/generated/prisma/client"
import { generateTradeHash } from "@/lib/utils"

const mappings: Record<string, string> = {
  "Account Name": "accountNumber",
  "Close Date": "closeDate",
  "Close Time": "closeTime",
  Commission: "commission",
  Duration: "timeInPosition",
  "Entry Price": "entryPrice",
  "Open Date": "entryDate",
  "Open Time": "entryTime",
  "Exit Price": "closePrice",
  Fee: "commission",
  "Gross P&L": "pnl",
  Instrument: "instrument",
  Quantity: "quantity",
  Side: "side",
  Symbol: "instrument",
  "Adjusted Cost": "entryId",
  "Adjusted Proceeds": "closeId",
}

export function parseTradezellaCsv(
  headers: string[],
  rows: string[][],
  accountNumber: string,
): Trade[] {
  const trades: Trade[] = []

  rows.forEach((row, rowIndex) => {
    const item: Partial<Trade> = {}
    let entryTime = ""
    let closeTime = ""

    headers.forEach((header, index) => {
      const key = mappings[header]
      if (!key) return
      const cellValue = row[index]
      switch (key) {
        case "entryTime":
          entryTime = cellValue
          break
        case "closeTime":
          closeTime = cellValue
          break
        case "pnl":
          item.pnl = parseFloat(cellValue)
          break
        case "commission":
          item.commission = parseFloat(cellValue)
          break
        case "quantity":
          item.quantity = parseFloat(cellValue)
          break
        case "timeInPosition":
          item.timeInPosition = parseFloat(cellValue)
          break
        default:
          ;(item as Record<string, unknown>)[key] = cellValue
      }
    })

    if (Object.values(item).some((value) => value === undefined)) return

    if (entryTime && closeTime) {
      item.entryDate = new Date(
        `${item.entryDate} ${entryTime.slice(0, 8)}`,
      ).toISOString()
      item.closeDate = new Date(
        `${item.closeDate} ${closeTime.slice(0, 8)}`,
      ).toISOString()
    }

    item.accountNumber = item.accountNumber || accountNumber
    item.id = generateTradeHash({
      ...item,
      entryId: `${item.entryId || ""}-${rowIndex}`,
    }).toString()

    trades.push(item as Trade)
  })

  return trades
}
