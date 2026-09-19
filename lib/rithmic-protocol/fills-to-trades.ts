import type { Trade } from '@/prisma/generated/prisma/client'
import { createTradeWithDefaults } from '@/lib/trade-factory'
import {
  generateDeterministicTradeId,
  RITHMIC_PROTOCOL_TRADE_TAG,
} from '@/lib/trade-id-utils'
import { formatTimestamp } from '@/lib/date-utils'
import type { RithmicProtocolFill } from './types'
import { commissionForFillQuantity } from './commission-rates'
import { canonicalRithmicFillId, fillDayKey } from './dedupe-fills'

interface TickSpec {
  tickSize: number
  tickValue: number
}

interface OpenLot {
  quantity: number
  price: number
  commission: number
  timestampMs: number
  orderId: string
}

interface LotBook {
  longs: OpenLot[]
  shorts: OpenLot[]
}

function bookKey(accountId: string, instrument: string): string {
  return `${accountId}|${instrument}`
}

export function normalizeInstrument(symbol: string): string {
  const clean = symbol.trim().toUpperCase()
  // Strip month/year code when present (e.g. ESH5 -> ES, MNQH5 -> MNQ)
  if (clean.length > 2 && /[FGHJKMNQUVXZ]\d{1,2}$/.test(clean)) {
    return clean.replace(/[FGHJKMNQUVXZ]\d{1,2}$/, '')
  }
  return clean
}

/**
 * Rithmic ShowFillHistory sends "BUY"/"SELL"; ExchangeOrderNotification /
 * ReplayExecutions decode the same field as enum 1/2/3 (SS).
 */
export function fillSide(transactionType: string): 'B' | 'S' {
  const t = String(transactionType)
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
  if (
    t === '1' ||
    t === 'BUY' ||
    t === 'B' ||
    t === 'BOT' ||
    t === 'LONG'
  ) {
    return 'B'
  }
  return 'S'
}

function parseFillDateParts(fillDate: string): string | null {
  const trimmed = fillDate.trim()
  const compact = trimmed.replace(/-/g, '')
  if (/^\d{8}$/.test(compact)) {
    return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`
  }
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed)
  if (dmy) {
    const day = dmy[1].padStart(2, '0')
    const month = dmy[2].padStart(2, '0')
    return `${dmy[3]}-${month}-${day}`
  }
  return null
}

function parseFillTimeIso(fillTime: string): string {
  const trimmed = fillTime.trim()
  const clock = /^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?/.exec(trimmed)
  if (clock) {
    const hour = clock[1].padStart(2, '0')
    const minute = clock[2]
    const second = (clock[3] ?? '00').padStart(2, '0')
    return `${hour}:${minute}:${second}`
  }
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length >= 6) {
    return `${digits.slice(0, 2)}:${digits.slice(2, 4)}:${digits.slice(4, 6)}`
  }
  if (digits.length === 4) {
    return `${digits.slice(0, 2)}:${digits.slice(2, 4)}:00`
  }
  return '00:00:00'
}

export function fillTimestampMs(fill: RithmicProtocolFill): number {
  if (typeof fill.ssboe === 'number' && fill.ssboe > 0) {
    const usecs = typeof fill.usecs === 'number' ? fill.usecs : 0
    return fill.ssboe * 1000 + Math.floor(usecs / 1000)
  }
  if (fill.fillDate) {
    const date = parseFillDateParts(fill.fillDate)
    if (date) {
      const time = fill.fillTime ? parseFillTimeIso(fill.fillTime) : '00:00:00'
      const parsed = Date.parse(`${date}T${time}Z`)
      if (!Number.isNaN(parsed)) return parsed
    }
  }
  return 0
}

function compareFills(a: RithmicProtocolFill, b: RithmicProtocolFill): number {
  const byTime = fillTimestampMs(a) - fillTimestampMs(b)
  if (byTime !== 0) return byTime
  const aId = canonicalRithmicFillId(a.fillId) ?? a.sequenceNumber ?? ''
  const bId = canonicalRithmicFillId(b.fillId) ?? b.sequenceNumber ?? ''
  return aId.localeCompare(bId)
}

function lotPnL(
  entryPrice: number,
  exitPrice: number,
  quantity: number,
  contractSpec: TickSpec,
  side: 'Long' | 'Short',
): number {
  if (quantity <= 0 || contractSpec.tickSize <= 0) return 0
  const ticks = (exitPrice - entryPrice) / contractSpec.tickSize
  const rawPnL = ticks * contractSpec.tickValue * quantity
  return side === 'Long' ? rawPnL : -rawPnL
}

function emitTrade(params: {
  accountId: string
  instrument: string
  side: 'Long' | 'Short'
  quantity: number
  entry: OpenLot
  exit: OpenLot
  matched: number
  contractSpec: TickSpec
  userId: string
}): Trade {
  const entryCommission =
    params.entry.quantity > 0
      ? (params.entry.commission * params.matched) / params.entry.quantity
      : 0
  const exitCommission =
    params.exit.quantity > 0
      ? (params.exit.commission * params.matched) / params.exit.quantity
      : 0
  const pnl = lotPnL(
    params.entry.price,
    params.exit.price,
    params.matched,
    params.contractSpec,
    params.side,
  )
  const entryDate = new Date(params.entry.timestampMs)
  const closeDate = new Date(params.exit.timestampMs)
  const tradeData = {
    accountNumber: params.accountId,
    entryId: params.entry.orderId,
    closeId: params.exit.orderId,
    instrument: params.instrument,
    entryPrice: params.entry.price.toString(),
    closePrice: params.exit.price.toString(),
    entryDate: formatTimestamp(entryDate.toISOString()),
    closeDate: formatTimestamp(closeDate.toISOString()),
    quantity: params.matched,
    side: params.side,
    userId: params.userId,
  }
  return createTradeWithDefaults({
    id: generateDeterministicTradeId(tradeData),
    ...tradeData,
    pnl,
    timeInPosition: Math.max(
      0,
      Math.round((closeDate.getTime() - entryDate.getTime()) / 1000),
    ),
    commission: Math.abs(entryCommission + exitCommission),
    tags: [RITHMIC_PROTOCOL_TRADE_TAG],
  })
}

function applyFillToBook(
  book: LotBook,
  incoming: OpenLot,
  side: 'B' | 'S',
  accountId: string,
  instrument: string,
  contractSpec: TickSpec,
  userId: string,
): Trade[] {
  const trades: Trade[] = []
  const opposite = side === 'B' ? book.shorts : book.longs
  const same = side === 'B' ? book.longs : book.shorts
  const closingSide: 'Long' | 'Short' = side === 'B' ? 'Short' : 'Long'

  while (incoming.quantity > 0 && opposite.length > 0) {
    const open = opposite[0]
    const matched = Math.min(incoming.quantity, open.quantity)
    trades.push(
      emitTrade({
        accountId,
        instrument,
        side: closingSide,
        quantity: matched,
        entry: open,
        exit: incoming,
        matched,
        contractSpec,
        userId,
      }),
    )
    const openShare = open.quantity > 0 ? matched / open.quantity : 1
    open.commission -= open.commission * openShare
    open.quantity -= matched
    const inShare = incoming.quantity > 0 ? matched / incoming.quantity : 1
    incoming.commission -= incoming.commission * inShare
    incoming.quantity -= matched
    if (open.quantity <= 0) opposite.shift()
  }

  if (incoming.quantity > 0) {
    same.push(incoming)
  }

  return trades
}

/**
 * Convert Rithmic fills into closed round-trip trades using FIFO matching
 * that supports both longs and shorts.
 *
 * A Sell with no long to close opens a short; a Buy closes that short (or
 * opens a long). Long-only pairing — treating every Buy as an entry and
 * skipping orphan Sells — mis-pairs short sellers as losing longs.
 */
export function buildTradesFromRithmicFills(
  fills: RithmicProtocolFill[],
  userId: string,
  tickBySymbol: Map<string, TickSpec>,
  commissionRates?: Map<string, number>,
): { trades: Trade[]; openSkipped: number } {
  const trades: Trade[] = []
  const books = new Map<string, LotBook>()

  const byAccount = new Map<string, RithmicProtocolFill[]>()
  for (const fill of fills) {
    if (!fill.symbol || !fill.fillSize || fill.fillSize <= 0) continue
    const accountId = fill.accountId || 'unknown'
    const list = byAccount.get(accountId) ?? []
    list.push(fill)
    byAccount.set(accountId, list)
  }

  for (const [accountId, accountFills] of byAccount) {
    const sorted = [...accountFills].sort(compareFills)
    const seenFillIds = new Set<string>()

    for (const fill of sorted) {
      const instrument = normalizeInstrument(fill.symbol)
      const quantity = Math.abs(Number(fill.fillSize))
      const price = Number(fill.fillPrice || fill.avgFillPrice || 0)
      if (!quantity || !price) continue

      const side = fillSide(fill.transactionType)
      const timestampMs = fillTimestampMs(fill)
      // Same Rithmic fill_id from overlapping sources must not FIFO-join into
      // `1452840-1452840` (2× qty / PnL). Key includes trade day so a recycled
      // fill_id on a later session is still a distinct fill.
      const fillId = canonicalRithmicFillId(fill.fillId)
      if (fillId) {
        const seenKey = `${fillDayKey(fill)}|${fillId}`
        if (seenFillIds.has(seenKey)) continue
        seenFillIds.add(seenKey)
      }
      const orderId =
        fillId ||
        fill.sequenceNumber ||
        `${fill.basketId ?? 'fill'}-${timestampMs}-${quantity}`

      const contractSpec =
        tickBySymbol.get(instrument) ?? ({ tickSize: 0.25, tickValue: 5 } as TickSpec)

      const incoming: OpenLot = {
        quantity,
        price,
        commission: commissionForFillQuantity(
          commissionRates,
          accountId,
          instrument,
          quantity,
        ),
        timestampMs,
        orderId,
      }

      const key = bookKey(accountId, instrument)
      const book = books.get(key) ?? { longs: [], shorts: [] }
      trades.push(
        ...applyFillToBook(
          book,
          incoming,
          side,
          accountId,
          instrument,
          contractSpec,
          userId,
        ),
      )
      books.set(key, book)
    }
  }

  let openSkipped = 0
  for (const book of books.values()) {
    if (book.longs.length > 0 || book.shorts.length > 0) {
      openSkipped += 1
    }
  }

  return { trades, openSkipped }
}
