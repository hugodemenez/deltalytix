import type { Trade } from '@/prisma/generated/prisma/client'
import { createTradeWithDefaults } from '@/lib/trade-factory'
import {
  generateDeterministicTradeId,
  RITHMIC_PROTOCOL_OPENING_SEED_TAG,
  RITHMIC_PROTOCOL_TRADE_TAG,
} from '@/lib/trade-id-utils'
import { formatTimestamp } from '@/lib/date-utils'
import { globexSessionOpenForTradeDate } from './cme-session'
import type { RithmicProtocolFill } from './types'
import { commissionForFillQuantity } from './commission-rates'
import { canonicalRithmicFillId, fillIdentityKey } from './dedupe-fills'

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
  synthetic?: boolean
}

export type OpeningLotSeed = {
  accountId: string
  symbol: string
  /** Signed: +long / −short, same convention as broker `net_quantity`. */
  netQuantity: number
  timestampMs: number
  orderId: string
}

interface LotBook {
  longs: OpenLot[]
  shorts: OpenLot[]
}

function bookKey(accountId: string, symbol: string): string {
  return `${encodeURIComponent(normalizeFillAccountId(accountId))}|${encodeURIComponent(symbol.trim().toUpperCase())}`
}

export type FifoOpenNet = {
  accountId: string
  symbol: string
  net: number
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

export function normalizeFillAccountId(
  accountId: string | null | undefined,
): string {
  const trimmed = (accountId ?? '').trim()
  return trimmed || 'unknown'
}

export function fillTimestampMs(fill: RithmicProtocolFill): number {
  if (typeof fill.ssboe === 'number' && fill.ssboe > 0) {
    const usecs = typeof fill.usecs === 'number' ? fill.usecs : 0
    return fill.ssboe * 1000 + Math.floor(usecs / 1000)
  }
  const date = fill.fillDate ? parseFillDateParts(fill.fillDate) : null
  if (!date) return 0
  // fillDate is the exchange trade date (rolls ~17:00 CT). Plants that omit
  // ssboe may still send a clock; treating that clock as UTC on the trade
  // date puts Sunday-evening fills a day ahead of Globex reopen. Pin every
  // date-only / date+time row to session open for that trade date.
  const sessionOpen = globexSessionOpenForTradeDate(date)
  return sessionOpen ? sessionOpen.getTime() : 0
}

export function fillIsInFifoWindow(
  fill: RithmicProtocolFill,
  sinceMs?: number,
): boolean {
  if (sinceMs == null || !Number.isFinite(sinceMs) || sinceMs <= 0) return true
  return fillTimestampMs(fill) >= sinceMs
}

function compareFills(
  a: RithmicProtocolFill,
  aIndex: number,
  b: RithmicProtocolFill,
  bIndex: number,
): number {
  const byTime = fillTimestampMs(a) - fillTimestampMs(b)
  if (byTime !== 0) return byTime
  // Fill ids are not monotonic in time. When clocks tie, keep arrival order.
  return aIndex - bIndex
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
  conservativeSeedClose?: boolean
}): Trade {
  const entryCommission = params.conservativeSeedClose
    ? 0
    : params.entry.quantity > 0
      ? (params.entry.commission * params.matched) / params.entry.quantity
      : 0
  const exitCommission =
    params.exit.quantity > 0
      ? (params.exit.commission * params.matched) / params.exit.quantity
      : 0
  const closePrice = params.exit.price
  const entryPrice = params.conservativeSeedClose ? closePrice : params.entry.price
  const pnl = params.conservativeSeedClose
    ? 0
    : lotPnL(
        entryPrice,
        closePrice,
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
    entryPrice: entryPrice.toString(),
    closePrice: closePrice.toString(),
    entryDate: formatTimestamp(entryDate.toISOString()),
    closeDate: formatTimestamp(closeDate.toISOString()),
    quantity: params.matched,
    side: params.side,
    userId: params.userId,
  }
  const tags = params.conservativeSeedClose
    ? [RITHMIC_PROTOCOL_TRADE_TAG, RITHMIC_PROTOCOL_OPENING_SEED_TAG]
    : [RITHMIC_PROTOCOL_TRADE_TAG]
  return createTradeWithDefaults({
    id: generateDeterministicTradeId(tradeData),
    ...tradeData,
    pnl,
    timeInPosition: Math.max(
      0,
      Math.round((closeDate.getTime() - entryDate.getTime()) / 1000),
    ),
    commission: Math.abs(entryCommission + exitCommission),
    tags,
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
        conservativeSeedClose: Boolean(open.synthetic),
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
  options?: { openingSeeds?: OpeningLotSeed[]; sinceMs?: number },
): {
  trades: Trade[]
  openSkipped: number
  skipped: Record<string, number>
  openNets: FifoOpenNet[]
} {
  const trades: Trade[] = []
  const books = new Map<string, LotBook>()
  const skipped: Record<string, number> = {}
  const bumpSkip = (reason: string) => {
    skipped[reason] = (skipped[reason] ?? 0) + 1
  }

  for (const seed of options?.openingSeeds ?? []) {
    if (!seed.netQuantity || !Number.isInteger(seed.netQuantity)) continue
    const symbol = seed.symbol.trim().toUpperCase()
    if (!symbol) continue
    const key = bookKey(seed.accountId, symbol)
    const book = books.get(key) ?? { longs: [], shorts: [] }
    const lot: OpenLot = {
      quantity: Math.abs(seed.netQuantity),
      price: 0,
      commission: 0,
      timestampMs: seed.timestampMs,
      orderId: seed.orderId,
      synthetic: true,
    }
    if (seed.netQuantity > 0) book.longs.push(lot)
    else book.shorts.push(lot)
    books.set(key, book)
  }

  const byAccount = new Map<string, RithmicProtocolFill[]>()
  for (const fill of fills) {
    if (!fillIsInFifoWindow(fill, options?.sinceMs)) {
      bumpSkip('before_fifo_window')
      continue
    }
    if (!fill.symbol) {
      bumpSkip('missing_symbol')
      continue
    }
    if (!fill.fillSize || fill.fillSize <= 0) {
      bumpSkip('missing_size')
      continue
    }
    const accountId = normalizeFillAccountId(fill.accountId)
    const list = byAccount.get(accountId) ?? []
    list.push(fill)
    byAccount.set(accountId, list)
  }

  for (const [accountId, accountFills] of byAccount) {
    const sorted = accountFills
      .map((fill, index) => ({ fill, index }))
      .sort((a, b) => compareFills(a.fill, a.index, b.fill, b.index))
    const seenFillIds = new Set<string>()

    for (const { fill } of sorted) {
      const symbol = fill.symbol.trim().toUpperCase()
      const instrument = normalizeInstrument(symbol)
      const quantity = Math.abs(Number(fill.fillSize))
      const price = Number(fill.fillPrice || fill.avgFillPrice || 0)
      if (!quantity) {
        bumpSkip('missing_size')
        continue
      }
      if (!price) {
        bumpSkip('missing_price')
        continue
      }

      const side = fillSide(fill.transactionType)
      const timestampMs = fillTimestampMs(fill)
      // Same Rithmic fill_id from overlapping sources must not FIFO-join into
      // `1452840-1452840` (2× qty / PnL). Identity includes symbol + fingerprint
      // so a reused fill_id on another instrument cannot drop this execution.
      const fillId = canonicalRithmicFillId(fill.fillId)
      if (fillId) {
        const seenKey = fillIdentityKey(fill)
        if (seenFillIds.has(seenKey)) {
          bumpSkip('duplicate_id')
          continue
        }
        seenFillIds.add(seenKey)
      }
      // Persist the canonical id (history form). Trade UUID hashing also
      // canonicalizes Replay prefixes, and save rematches rows stored under
      // the older `basketId_fillId` form.
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

      const key = bookKey(accountId, symbol)
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
  const openNets: FifoOpenNet[] = []
  for (const [key, book] of books) {
    let net = 0
    for (const lot of book.longs) {
      openSkipped += lot.quantity
      net += lot.quantity
    }
    for (const lot of book.shorts) {
      openSkipped += lot.quantity
      net -= lot.quantity
    }
    const separator = key.indexOf('|')
    const accountId = decodeURIComponent(
      separator < 0 ? key : key.slice(0, separator),
    )
    const symbol = decodeURIComponent(
      separator < 0 ? '' : key.slice(separator + 1),
    )
    if (net !== 0) openNets.push({ accountId, symbol, net })
  }

  return { trades, openSkipped, skipped, openNets }
}
