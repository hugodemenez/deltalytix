import type { Trade } from "@/prisma/generated/prisma/client"
import { createTradeWithDefaults } from "@/lib/trade-factory"

export function parseFtmoCsv(
  _headers: string[],
  rows: string[][],
  accountNumber: string,
): Trade[] {
  const trades: Trade[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.length === 0 || !row[0] || row[0].trim() === "") continue
    if (row.length < 15) continue

    const ticket = row[0]?.trim() || ""
    const openTime = row[1]?.trim() || ""
    const type = row[2]?.trim().toLowerCase() || ""
    const volume = parseFloat(row[3]?.replace(",", ".") || "0")
    const symbol = row[4]?.trim() || ""
    const entryPrice = parseFloat(row[5]?.replace(",", ".") || "0")
    const closeTime = row[8]?.trim() || ""
    const exitPrice = parseFloat(row[9]?.replace(",", ".") || "0")
    const swap = parseFloat(row[10]?.replace(",", ".") || "0")
    const commission = parseFloat(row[11]?.replace(",", ".") || "0")
    const profit = parseFloat(row[12]?.replace(",", ".") || "0")
    const duration = parseInt(row[14]?.replace(",", ".") || "0", 10)

    if (!ticket || !symbol || !openTime || !closeTime) continue

    const openDate = new Date(openTime)
    const closeDate = new Date(closeTime)
    if (isNaN(openDate.getTime()) || isNaN(closeDate.getTime())) continue

    const side = type === "buy" ? "long" : "short"
    const quantity = Math.abs(volume)
    const totalCommission = Math.abs(commission) - swap

    const trade = createTradeWithDefaults({
      quantity,
      instrument: symbol,
      entryPrice: entryPrice.toString(),
      closePrice: exitPrice.toString(),
      entryDate: openDate.toISOString(),
      closeDate: closeDate.toISOString(),
      pnl: profit,
      commission: totalCommission,
      timeInPosition: duration,
      side,
      accountNumber,
      comment: `FTMO Trade ${ticket}`,
      tags: ["ftmo"],
    })

    trades.push(trade as Trade)
  }

  return trades
}
