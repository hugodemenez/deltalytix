import type { Trade } from "@/prisma/generated/prisma/client"
import { generateTradeHash } from "@/lib/utils"

const mappings: Record<string, string> = {
  symbol: "instrument",
  qty: "quantity",
  pnl: "pnl",
  duration: "timeInPosition",
  buyFillId: "entryId",
  buyPrice: "entryPrice",
  boughtTimestamp: "entryDate",
  sellFillId: "closeId",
  sellPrice: "closePrice",
  soldTimestamp: "closeDate",
}

function formatPnl(pnl: string | undefined): number | null {
  if (typeof pnl !== "string" || pnl.trim() === "") return null
  let formatted = pnl.trim()
  if (formatted.includes("(")) {
    formatted = formatted.replace("(", "-").replace(")", "")
  }
  const numericValue = parseFloat(formatted.replace(/[$,]/g, ""))
  return isNaN(numericValue) ? null : numericValue
}

function convertTimeInPosition(time: string | undefined): number {
  if (typeof time !== "string" || time.trim() === "") return 0
  if (/^\d+\.\d+$/.test(time)) return Math.round(parseFloat(time))
  const minutesMatch = time.match(/(\d+)min/)
  const secondsMatch = time.match(/(\d+)sec/)
  const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0
  const seconds = secondsMatch ? parseInt(secondsMatch[1], 10) : 0
  return minutes * 60 + seconds
}

function parseTradovateDate(cellValue: string): string | undefined {
  const [datePart, timePart] = cellValue.split(" ")
  if (!datePart || !timePart) return undefined
  const [month, day, year] = datePart.split("/").map(Number)
  const [hours, minutes, seconds] = timePart.split(":").map(Number)
  if ([year, month, day, hours, minutes, seconds].some((n) => isNaN(n))) {
    return undefined
  }
  const localDate = new Date(year, month - 1, day, hours, minutes, seconds)
  if (isNaN(localDate.getTime())) return undefined
  return localDate.toISOString()
}

export function parseTradovateCsv(
  headers: string[],
  rows: string[][],
  accountNumber: string,
): Trade[] {
  const trades: Trade[] = []

  for (const row of rows) {
    const item: Partial<Trade> = {}
    let valid = true

    headers.forEach((header, index) => {
      const key = mappings[header] as keyof Trade | undefined
      if (!key) return
      const cellValue = row[index]

      switch (key) {
        case "quantity":
          item.quantity = parseFloat(cellValue) || 0
          break
        case "pnl": {
          const pnl = formatPnl(cellValue)
          if (pnl === null) {
            valid = false
            return
          }
          item.pnl = pnl
          break
        }
        case "timeInPosition":
          item.timeInPosition = convertTimeInPosition(cellValue)
          break
        case "entryDate":
        case "closeDate": {
          if (!cellValue) {
            valid = false
            return
          }
          const parsed = parseTradovateDate(cellValue)
          if (!parsed) {
            valid = false
            return
          }
          item[key] = parsed
          break
        }
        default:
          ;(item as Record<string, unknown>)[key as string] = cellValue
      }
    })

    if (!valid || !item.instrument || !item.quantity) continue

    item.accountNumber = accountNumber
    item.commission = item.commission ?? 0
    item.side = item.side || ""
    item.id = generateTradeHash(item).toString()
    trades.push(item as Trade)
  }

  return trades
}
