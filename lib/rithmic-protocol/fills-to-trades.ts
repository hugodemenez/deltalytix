import type { Trade } from '@/prisma/generated/prisma/client'
import { createTradeWithDefaults } from '@/lib/trade-factory'
import { generateDeterministicTradeId } from '@/lib/trade-id-utils'
import { formatTimestamp } from '@/lib/date-utils'
import type { RithmicProtocolFill } from './types'

interface TickSpec {
  tickSize: number
  tickValue: number
}

interface FillOrder {
  quantity: number
  price: number
  commission: number
  timestampMs: number
  orderId: string
}

interface OpenPosition {
  quantity: number
  instrument: string
  side: 'Long' | 'Short'
  entryOrders: FillOrder[]
  exitOrders: FillOrder[]
  averageEntryPrice: number
  entryDateMs: number
  totalCommission: number
  originalQuantity: number
}

function normalizeInstrument(symbol: string): string {
  const clean = symbol.trim().toUpperCase()
  // Strip month/year code when present (e.g. ESH5 -> ES, MNQH5 -> MNQ)
  if (clean.length > 2 && /[FGHJKMNQUVXZ]\d{1,2}$/.test(clean)) {
    return clean.replace(/[FGHJKMNQUVXZ]\d{1,2}$/, '')
  }
  return clean
}

function fillSide(transactionType: string): 'B' | 'S' {
  const t = String(transactionType).trim().toUpperCase()
  if (t === '1' || t === 'BUY' || t === 'B') return 'B'
  return 'S'
}

function fillTimestampMs(fill: RithmicProtocolFill): number {
  if (typeof fill.ssboe === 'number' && fill.ssboe > 0) {
    const usecs = typeof fill.usecs === 'number' ? fill.usecs : 0
    return fill.ssboe * 1000 + Math.floor(usecs / 1000)
  }
  if (fill.fillDate && fill.fillTime) {
    // Common Rithmic formats: YYYYMMDD + HH:MM:SS
    const d = fill.fillDate.replace(/-/g, '')
    const t = fill.fillTime.replace(/[^0-9:]/g, '')
    if (/^\d{8}$/.test(d)) {
      const iso = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T${t.includes(':') ? t : '00:00:00'}Z`
      const parsed = Date.parse(iso)
      if (!Number.isNaN(parsed)) return parsed
    }
  }
  return Date.now()
}

function calculatePnL(
  entryOrders: FillOrder[],
  exitOrders: FillOrder[],
  contractSpec: TickSpec,
  side: 'Long' | 'Short',
): number {
  const totalEntryQuantity = entryOrders.reduce((sum, o) => sum + o.quantity, 0)
  const totalExitQuantity = exitOrders.reduce((sum, o) => sum + o.quantity, 0)
  const quantity = Math.min(totalEntryQuantity, totalExitQuantity)
  if (quantity <= 0 || totalEntryQuantity <= 0 || totalExitQuantity <= 0) return 0

  const avgEntry =
    entryOrders.reduce((sum, o) => sum + o.price * o.quantity, 0) / totalEntryQuantity
  const avgExit =
    exitOrders.reduce((sum, o) => sum + o.price * o.quantity, 0) / totalExitQuantity

  const ticks = (avgExit - avgEntry) / contractSpec.tickSize
  const rawPnL = ticks * contractSpec.tickValue * quantity
  return side === 'Long' ? rawPnL : -rawPnL
}

/**
 * Convert Rithmic fills into closed round-trip trades using FIFO matching
 * (same approach as the Rithmic CSV order processor).
 */
export function buildTradesFromRithmicFills(
  fills: RithmicProtocolFill[],
  userId: string,
  tickBySymbol: Map<string, TickSpec>,
): { trades: Trade[]; openSkipped: number } {
  const trades: Trade[] = []
  let openSkipped = 0

  const byAccount = new Map<string, RithmicProtocolFill[]>()
  for (const fill of fills) {
    if (!fill.symbol || !fill.fillSize || fill.fillSize <= 0) continue
    const accountId = fill.accountId || 'unknown'
    const list = byAccount.get(accountId) ?? []
    list.push(fill)
    byAccount.set(accountId, list)
  }

  for (const [accountId, accountFills] of byAccount) {
    const sorted = [...accountFills].sort(
      (a, b) => fillTimestampMs(a) - fillTimestampMs(b),
    )
    const openPositions: Record<string, OpenPosition> = {}

    for (const fill of sorted) {
      const instrument = normalizeInstrument(fill.symbol)
      const quantity = Math.abs(Number(fill.fillSize))
      const price = Number(fill.fillPrice || fill.avgFillPrice || 0)
      if (!quantity || !price) continue

      const side = fillSide(fill.transactionType)
      const timestampMs = fillTimestampMs(fill)
      const orderId =
        fill.fillId ||
        fill.sequenceNumber ||
        `${fill.basketId ?? 'fill'}-${timestampMs}-${quantity}`

      const contractSpec =
        tickBySymbol.get(instrument) ?? ({ tickSize: 0.25, tickValue: 5 } as TickSpec)

      const newOrder: FillOrder = {
        quantity,
        price,
        commission: 0,
        timestampMs,
        orderId,
      }

      const open = openPositions[instrument]
      if (open) {
        const isClosing =
          (side === 'B' && open.side === 'Short') ||
          (side === 'S' && open.side === 'Long')

        if (isClosing) {
          open.exitOrders.push(newOrder)
          open.quantity -= quantity
          open.totalCommission += newOrder.commission

          if (open.quantity <= 0) {
            const closedQty = open.originalQuantity
            const avgExit =
              open.exitOrders.reduce((s, o) => s + o.price * o.quantity, 0) /
              open.exitOrders.reduce((s, o) => s + o.quantity, 0)
            const pnl = calculatePnL(
              open.entryOrders,
              open.exitOrders,
              contractSpec,
              open.side,
            )
            const entryId = open.entryOrders.map((o) => o.orderId).join('-')
            const closeId = open.exitOrders.map((o) => o.orderId).join('-')
            const entryDate = new Date(open.entryDateMs)
            const closeDate = new Date(timestampMs)

            const tradeData = {
              accountNumber: accountId,
              entryId,
              closeId,
              instrument,
              entryPrice: open.averageEntryPrice.toString(),
              closePrice: avgExit.toString(),
              entryDate: formatTimestamp(entryDate.toISOString()),
              closeDate: formatTimestamp(closeDate.toISOString()),
              quantity: closedQty,
              side: open.side,
              userId,
            }

            trades.push(
              createTradeWithDefaults({
                id: generateDeterministicTradeId(tradeData),
                ...tradeData,
                pnl,
                timeInPosition: Math.max(
                  0,
                  Math.round((closeDate.getTime() - entryDate.getTime()) / 1000),
                ),
                commission: Math.abs(open.totalCommission),
                tags: ['rithmic-protocol'],
              }),
            )

            if (open.quantity < 0) {
              openPositions[instrument] = {
                quantity: -open.quantity,
                instrument,
                side: side === 'B' ? 'Long' : 'Short',
                entryOrders: [newOrder],
                exitOrders: [],
                averageEntryPrice: price,
                entryDateMs: timestampMs,
                totalCommission: newOrder.commission,
                originalQuantity: -open.quantity,
              }
            } else {
              delete openPositions[instrument]
            }
          }
        } else {
          const newQuantity = open.quantity + quantity
          open.averageEntryPrice =
            (open.averageEntryPrice * open.quantity + price * quantity) / newQuantity
          open.quantity = newQuantity
          open.originalQuantity = newQuantity
          open.entryOrders.push(newOrder)
          open.totalCommission += newOrder.commission
        }
      } else {
        openPositions[instrument] = {
          quantity,
          instrument,
          side: side === 'B' ? 'Long' : 'Short',
          entryOrders: [newOrder],
          exitOrders: [],
          averageEntryPrice: price,
          entryDateMs: timestampMs,
          totalCommission: newOrder.commission,
          originalQuantity: quantity,
        }
      }
    }

    openSkipped += Object.keys(openPositions).length
  }

  return { trades, openSkipped }
}
