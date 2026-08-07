/**
 * Maps an IBKR Flex statement into Deltalytix trades.
 *
 * We read the Trades section at EXECUTION level and pair executions ourselves
 * with FIFO. Flex can also emit CLOSED_LOT rows carrying IBKR's own
 * `fifoPnlRealized`, but those rows do not reliably carry the opening price and
 * time that the journal needs, and requiring them would add another checkbox to
 * the user's query setup. Executions carry everything, so one section with its
 * default options is enough — which is the whole point of this integration.
 *
 * P&L is computed as (exit - entry) x quantity x multiplier, signed by
 * direction. That is exact for futures, options and equities alike, because
 * Flex reports the contract multiplier per execution.
 */

import { parseFlexDateTime } from './ibkr-flex-date'
import { extractElements } from './ibkr-flex-xml'

export interface FlexExecution {
  accountId: string
  /** IBKR's per-execution ID; used to build stable entry/close IDs. */
  tradeId: string
  /** Symbol as traded, e.g. "MESZ5" — the FIFO grouping key. */
  rawSymbol: string
  /** Display symbol, e.g. "MES" for futures, "AAPL" for equities. */
  instrument: string
  assetCategory: string
  currency: string
  multiplier: number
  side: 'BUY' | 'SELL'
  quantity: number
  price: number
  /** Always non-negative; Flex reports commissions as negative numbers. */
  commission: number
  timestamp: string
}

export interface FlexParseStats {
  tradeRows: number
  executionRows: number
  closedLotRows: number
  skippedUnparseableDate: number
  skippedIncomplete: number
  currencies: string[]
  accountIds: string[]
}

export interface FlexParseResult {
  executions: FlexExecution[]
  stats: FlexParseStats
}

/** Futures and their options report the tradeable root on `underlyingSymbol`. */
const UNDERLYING_ASSET_CATEGORIES = new Set(['FUT', 'FOP', 'OPT', 'CFD'])

function toNumber(value: string | undefined, fallback = 0): number {
  if (value === undefined || value.trim() === '') return fallback
  // Flex emits thousands separators in some locale configurations.
  const parsed = Number(value.replace(/,/g, ''))
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeSide(value: string | undefined): 'BUY' | 'SELL' | null {
  const upper = (value ?? '').trim().toUpperCase()
  // Cancellations arrive as "BUY (Ca.)" / "SELL (Ca.)".
  if (upper.startsWith('BUY')) return 'BUY'
  if (upper.startsWith('SELL')) return 'SELL'
  return null
}

function resolveInstrument(row: Record<string, string>): string {
  const assetCategory = (row.assetCategory ?? '').toUpperCase()
  const underlying = (row.underlyingSymbol ?? '').trim()
  const symbol = (row.symbol ?? '').trim()

  if (UNDERLYING_ASSET_CATEGORIES.has(assetCategory) && underlying) {
    return underlying.toUpperCase()
  }
  return (symbol || underlying).toUpperCase()
}

/**
 * Reads the Trades section of a Flex statement into normalized executions,
 * sorted oldest first so FIFO matching is well-defined.
 */
export function parseFlexStatement(xml: string): FlexParseResult {
  const statements = extractElements(xml, 'FlexStatement')
  const rows = extractElements(xml, 'Trade')

  const executions: FlexExecution[] = []
  const currencies = new Set<string>()
  const accountIds = new Set<string>()

  let executionRows = 0
  let closedLotRows = 0
  let skippedUnparseableDate = 0
  let skippedIncomplete = 0

  for (const statement of statements) {
    if (statement.accountId) accountIds.add(statement.accountId)
  }

  for (const row of rows) {
    const levelOfDetail = (row.levelOfDetail ?? '').toUpperCase()

    if (levelOfDetail === 'CLOSED_LOT') {
      closedLotRows += 1
      continue
    }
    // ORDER rows are aggregates of the executions we already read; counting
    // both would double every position.
    if (levelOfDetail === 'ORDER') continue

    executionRows += 1

    const side = normalizeSide(row.buySell)
    const quantity = Math.abs(toNumber(row.quantity))
    const price = toNumber(row.tradePrice, Number.NaN)
    const instrument = resolveInstrument(row)
    const rawSymbol = (row.symbol ?? '').trim() || instrument

    if (!side || quantity <= 0 || !Number.isFinite(price) || !instrument) {
      skippedIncomplete += 1
      continue
    }

    const timestamp =
      parseFlexDateTime(row.dateTime) ??
      parseFlexDateTime(row.tradeDate, row.tradeTime) ??
      parseFlexDateTime(row.tradeDate)

    if (!timestamp) {
      skippedUnparseableDate += 1
      continue
    }

    if (row.currency) currencies.add(row.currency.toUpperCase())
    if (row.accountId) accountIds.add(row.accountId)

    executions.push({
      accountId: (row.accountId ?? '').trim() || statements[0]?.accountId || 'IBKR',
      tradeId: (row.tradeID ?? row.transactionID ?? row.ibExecID ?? '').trim(),
      rawSymbol,
      instrument,
      assetCategory: (row.assetCategory ?? '').toUpperCase(),
      currency: (row.currency ?? '').toUpperCase(),
      // A missing multiplier means a 1:1 instrument (equities, cash).
      multiplier: toNumber(row.multiplier, 1) || 1,
      side,
      quantity,
      price,
      commission: Math.abs(toNumber(row.ibCommission)),
      timestamp,
    })
  }

  executions.sort((a, b) => a.timestamp.localeCompare(b.timestamp))

  return {
    executions,
    stats: {
      tradeRows: rows.length,
      executionRows,
      closedLotRows,
      skippedUnparseableDate,
      skippedIncomplete,
      currencies: Array.from(currencies).sort(),
      accountIds: Array.from(accountIds).sort(),
    },
  }
}

/** A round-turn produced by pairing an opening execution with a closing one. */
export interface FlexMatchedTrade {
  accountId: string
  instrument: string
  currency: string
  side: 'Long' | 'Short'
  quantity: number
  entryId: string
  closeId: string
  entryPrice: number
  closePrice: number
  entryDate: string
  closeDate: string
  pnl: number
  commission: number
  timeInPosition: number
}

interface OpenLot {
  execution: FlexExecution
  /** Quantity still open on this execution. */
  remaining: number
}

/**
 * Pairs executions into round-turns using FIFO, per account and per contract.
 *
 * Positions that flip through zero are handled by closing the outstanding lots
 * first and opening the remainder in the new direction. Executions left open at
 * the end of the statement are simply not emitted — an open position is not a
 * trade yet.
 */
export function matchExecutionsFifo(executions: FlexExecution[]): FlexMatchedTrade[] {
  const openLotsByKey = new Map<string, OpenLot[]>()
  const trades: FlexMatchedTrade[] = []

  for (const execution of executions) {
    const key = `${execution.accountId}::${execution.rawSymbol}`
    const openLots = openLotsByKey.get(key) ?? []
    let unmatched = execution.quantity

    while (unmatched > 0 && openLots.length > 0 && openLots[0].execution.side !== execution.side) {
      const lot = openLots[0]
      const matchedQuantity = Math.min(lot.remaining, unmatched)

      const isLong = lot.execution.side === 'BUY'
      const entryPrice = lot.execution.price
      const closePrice = execution.price
      const multiplier = lot.execution.multiplier || 1

      const grossPnl =
        (closePrice - entryPrice) * matchedQuantity * multiplier * (isLong ? 1 : -1)

      // Commission is reported per execution, so charge the matched slice of each.
      const entryCommission =
        (lot.execution.commission / lot.execution.quantity) * matchedQuantity
      const closeCommission = (execution.commission / execution.quantity) * matchedQuantity

      const entryMs = new Date(lot.execution.timestamp).getTime()
      const closeMs = new Date(execution.timestamp).getTime()

      trades.push({
        accountId: execution.accountId,
        instrument: execution.instrument,
        currency: execution.currency || lot.execution.currency,
        side: isLong ? 'Long' : 'Short',
        quantity: matchedQuantity,
        entryId: lot.execution.tradeId,
        closeId: execution.tradeId,
        entryPrice,
        closePrice,
        entryDate: lot.execution.timestamp,
        closeDate: execution.timestamp,
        pnl: Number(grossPnl.toFixed(2)),
        commission: Number((entryCommission + closeCommission).toFixed(2)),
        timeInPosition: Math.max(0, Math.round((closeMs - entryMs) / 1000)),
      })

      lot.remaining -= matchedQuantity
      unmatched -= matchedQuantity
      if (lot.remaining <= 0) openLots.shift()
    }

    if (unmatched > 0) {
      openLots.push({ execution, remaining: unmatched })
    }
    openLotsByKey.set(key, openLots)
  }

  return trades
}
