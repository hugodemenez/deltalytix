import type { Trade } from "@/prisma/generated/prisma/client"

const mappings: Record<string, string> = {
  ContractName: "instrument",
  Size: "quantity",
  PnL: "pnl",
  Fees: "commission",
  Type: "side",
  Id: "entryId",
  EntryPrice: "entryPrice",
  EnteredAt: "entryDate",
  ExitPrice: "closePrice",
  ExitedAt: "closeDate",
}

export function parseTopstepCsv(
  headers: string[],
  rows: string[][],
  accountNumber: string,
): Trade[] {
  const trades: Trade[] = []

  for (const row of rows) {
    const item: Partial<Trade> = {}
    let isValidTrade = true

    headers.forEach((header, index) => {
      const mappingKey = Object.keys(mappings).find((key) => header.includes(key))
      if (!mappingKey) return
      const key = mappings[mappingKey] as keyof Trade
      const cellValue = row[index]

      if (
        !cellValue &&
        ["instrument", "quantity", "entryPrice", "closePrice", "entryDate", "closeDate"].includes(
          key as string,
        )
      ) {
        isValidTrade = false
        return
      }

      switch (key) {
        case "quantity": {
          const quantity = parseFloat(cellValue) || 0
          if (quantity <= 0) {
            isValidTrade = false
            return
          }
          item.quantity = quantity
          break
        }
        case "pnl": {
          const pnl = parseFloat(cellValue)
          if (isNaN(pnl)) {
            isValidTrade = false
            return
          }
          item.pnl = pnl
          break
        }
        case "commission": {
          const commission = parseFloat(cellValue) || 0
          if (commission < 0) {
            isValidTrade = false
            return
          }
          item.commission = commission
          break
        }
        case "side":
          if (!cellValue) {
            isValidTrade = false
            return
          }
          item.side = cellValue.toLowerCase()
          break
        case "entryPrice":
        case "closePrice": {
          const price = parseFloat(cellValue)
          if (isNaN(price) || price <= 0) {
            isValidTrade = false
            return
          }
          item[key] = price.toString()
          break
        }
        case "instrument":
          if (!cellValue) {
            isValidTrade = false
            return
          }
          item.instrument = cellValue.slice(0, -2)
          break
        default:
          ;(item as Record<string, unknown>)[key as string] = cellValue
      }
    })

    try {
      if (item.entryDate) {
        const date = new Date(item.entryDate)
        if (isNaN(date.getTime())) {
          isValidTrade = false
        } else {
          item.entryDate = date.toISOString().replace("Z", "+00:00")
        }
      }
      if (item.closeDate) {
        const date = new Date(item.closeDate)
        if (isNaN(date.getTime())) {
          isValidTrade = false
        } else {
          item.closeDate = date.toISOString().replace("Z", "+00:00")
        }
      }
    } catch {
      isValidTrade = false
    }

    if (item.entryDate && item.closeDate) {
      const entryTime = new Date(item.entryDate).getTime()
      const closeTime = new Date(item.closeDate).getTime()
      item.timeInPosition = Math.round((closeTime - entryTime) / 1000)
    } else {
      isValidTrade = false
    }

    item.accountNumber = accountNumber
    item.id = `${item.instrument}-${item.entryId}-${item.closeId}-${item.quantity}`

    if (isValidTrade) trades.push(item as Trade)
  }

  return trades
}
