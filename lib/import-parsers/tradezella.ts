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
      const entry = combineDateAndTime(String(item.entryDate), entryTime)
      const close = combineDateAndTime(String(item.closeDate), closeTime)
      // An unparseable date would throw in toISOString(); skip the row instead.
      if (!entry || !close) return
      item.entryDate = entry
      item.closeDate = close
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

/**
 * XLSX date and time cells arrive as ISO strings (`2024-01-02T00:00:00.000Z`,
 * `1899-12-30T09:30:00.000Z`), CSV cells as plain `2024-01-02` / `09:30:00`.
 * Returns null when the pair does not form a valid date.
 */
function combineDateAndTime(date: string, time: string): string | null {
  const datePart = date.includes("T") ? date.slice(0, 10) : date
  const timePart = time.includes("T")
    ? (time.split("T")[1] ?? "").slice(0, 8)
    : time.slice(0, 8)
  const parsed = new Date(`${datePart} ${timePart}`)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}
