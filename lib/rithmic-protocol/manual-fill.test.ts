import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { RITHMIC_PROTOCOL_TRADE_TAG } from '@/lib/trade-id-utils'
import {
  canonicalLedgerFillIds,
  countDistinctManualTradesKept,
  countRetiredManualTradesKept,
  deriveTradesFromFillLedger,
  phantomProtocolTradeIds,
  planManualFillSyncEffects,
  prepareRithmicProtocolFills,
  retiredManualFillIds,
} from './fill-ledger'
import { buildTradesFromRithmicFills } from './fills-to-trades'
import type { RithmicProtocolFill } from './types'

vi.mock('@/lib/prisma', () => {
  const client = {
    account: { findFirst: vi.fn() },
    rithmicProtocolFill: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      createMany: vi.fn(),
      updateMany: vi.fn(),
    },
    trade: { findMany: vi.fn(async () => []) },
    $disconnect: vi.fn(),
  }
  return { prisma: client, prismaBase: client }
})

import {
  insertManualRithmicProtocolFill,
  manualFillId,
  parseManualFillCliArgs,
  confirmDistinctManualRithmicProtocolFill,
  retireManualRithmicProtocolFill,
  validateManualFillInput,
  type ValidatedManualFill,
} from './manual-fill'

const base = {
  userId: 'user-1',
  accountNumber: 'LFE050-I7X0S9B3-TEST001',
  symbol: 'MESZ6',
  exchange: 'CME',
  side: 'buy',
  qty: 2,
  price: 5810.25,
  timestamp: '2026-09-25T17:07:00+02:00',
  note: 'Rithmic order history omitted this 2-lot MESZ6 buy',
}

function validated(): ValidatedManualFill {
  const result = validateManualFillInput({ ...base, dryRun: true })
  if (!result.ok) throw new Error(result.errors.map((error) => error.message).join('; '))
  return result.value
}

describe('validateManualFillInput', () => {
  it('accepts a complete patch and defaults dryRun to true', () => {
    const result = validateManualFillInput(base)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.dryRun).toBe(true)
    expect(result.value.side).toBe('B')
    expect(result.value.symbol).toBe('MESZ6')
    expect(result.value.exchange).toBe('CME')
    expect(result.value.qty).toBe(2)
  })

  it('rejects missing note, non-positive qty, bad side, and a date-only timestamp', () => {
    const result = validateManualFillInput({
      ...base,
      note: '   ',
      qty: 0,
      side: 'hold',
      timestamp: '2026-09-25',
      price: Number.NaN,
      dryRun: 'true',
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    const fields = result.errors.map((error) => error.field)
    expect(fields).toEqual(
      expect.arrayContaining(['note', 'qty', 'side', 'timestamp', 'price', 'dryRun']),
    )
  })

  it('rejects a non-integer qty and a blank exchange', () => {
    const result = validateManualFillInput({ ...base, qty: 2.5, exchange: '' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.map((error) => error.field)).toEqual(
      expect.arrayContaining(['qty', 'exchange']),
    )
  })
})

describe('manual fill id', () => {
  it('is stable, prefixed, and ignores the note', () => {
    const first = validated()
    const renamed = { ...first, note: 'a different reason' }
    expect(manualFillId(first)).toBe(manualFillId(renamed))
    expect(manualFillId(first).startsWith('manual-')).toBe(true)
    expect(manualFillId({ ...first, price: first.price + 0.25 })).not.toBe(
      manualFillId(first),
    )
  })
})

describe('retireManualRithmicProtocolFill', () => {
  const findManualFill = vi.fn()
  const markRetired = vi.fn()

  beforeEach(() => {
    findManualFill.mockReset().mockResolvedValue({ fillId: 'manual-gap', source: 'manual' })
    markRetired.mockReset().mockResolvedValue(undefined)
  })

  it('previews a retire without writing', async () => {
    const result = await retireManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        reason: 'plant fill arrived',
      },
      { findManualFill, markRetired },
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.dryRun).toBe(true)
    expect(result.source).toBe('manual-retired')
    expect(result.retireReason).toBe('plant fill arrived')
    expect(markRetired).not.toHaveBeenCalled()
  })

  it('writes the retire audit on apply and is idempotent afterwards', async () => {
    const applied = await retireManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        reason: 'plant fill arrived',
        retiredBy: 'admin-1',
        dryRun: false,
      },
      { findManualFill, markRetired },
    )
    expect(applied.ok).toBe(true)
    expect(markRetired).toHaveBeenCalledTimes(1)
    const written = markRetired.mock.calls[0][0] as {
      retireReason: string
      retiredBy: string
      source?: string
    }
    expect(written.retireReason).toBe('plant fill arrived')
    expect(written.retiredBy).toBe('admin-1')
    const retiredAt = new Date('2026-09-26T12:00:00.000Z')
    findManualFill.mockResolvedValue({
      fillId: 'manual-gap',
      source: 'manual-retired',
      retiredAt,
      retiredBy: 'admin-1',
      retireReason: 'plant fill arrived',
    })
    const again = await retireManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        reason: 'a later reason must not replace the audit',
        dryRun: false,
      },
      { findManualFill, markRetired },
    )
    expect(again.ok).toBe(true)
    if (!again.ok) return
    expect(again.idempotent).toBe(true)
    expect(again.retiredAt).toBe(retiredAt.toISOString())
    expect(again.retiredBy).toBe('admin-1')
    expect(again.retireReason).toBe('plant fill arrived')
    expect(markRetired).toHaveBeenCalledTimes(1)
  })

  it('lists derived trades and refuses an unacknowledged apply when one is annotated', async () => {
    const trades = [
      {
        id: 'stored-manual-trade',
        entryId: 'manual-gap',
        closeId: '1002',
        instrument: 'MES',
        annotated: true,
      },
    ]
    const findDerivedTrades = vi.fn(async () => trades)
    const preview = await retireManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        reason: 'wrong price',
      },
      { findManualFill, markRetired, findDerivedTrades },
    )
    expect(preview.ok).toBe(true)
    if (!preview.ok) return
    expect(preview.dryRun).toBe(true)
    expect(preview.trades).toEqual(trades)
    expect(markRetired).not.toHaveBeenCalled()
    const refused = await retireManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        reason: 'wrong price',
        dryRun: false,
      },
      { findManualFill, markRetired, findDerivedTrades },
    )
    expect(refused.ok).toBe(false)
    if (refused.ok) return
    expect(refused.status).toBe('acknowledgement_required')
    expect(refused.trades).toEqual(trades)
    expect(markRetired).not.toHaveBeenCalled()
    const applied = await retireManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        reason: 'wrong price',
        dryRun: false,
        acknowledgeAnnotatedTrades: true,
      },
      { findManualFill, markRetired, findDerivedTrades },
    )
    expect(applied.ok).toBe(true)
    if (!applied.ok) return
    expect(applied.trades).toEqual(trades)
    expect(markRetired).toHaveBeenCalledTimes(1)
  })
})

describe('confirmDistinctManualRithmicProtocolFill', () => {
  const findManualFill = vi.fn()
  const loadAccountFills = vi.fn()
  const markDistinct = vi.fn()
  const manualRow = {
    fillId: 'manual-gap',
    source: 'manual',
    accountNumber: base.accountNumber,
    symbol: 'MESZ6',
    transactionType: 'BUY',
    fillPrice: 5810.25,
    fillSize: 2,
    fillDate: '20260925',
    fillTime: '15:07:00',
    ssboe: 1_758_810_420,
    confirmedDistinctFillId: null,
    confirmedDistinctAt: null,
    confirmedDistinctBy: null,
    confirmDistinctReason: null,
  }
  const nearMiss = {
    ...manualRow,
    fillId: '88422',
    source: 'history',
    fillSize: 1,
  }

  beforeEach(() => {
    findManualFill.mockReset().mockResolvedValue(manualRow)
    loadAccountFills.mockReset().mockResolvedValue([manualRow, nearMiss])
    markDistinct.mockReset().mockResolvedValue(undefined)
  })

  it('previews without writing and records the plant fill on apply', async () => {
    const preview = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        upstreamFillId: '88422',
        reason: 'next session, not this patch',
      },
      { findManualFill, loadAccountFills, markDistinct },
    )
    expect(preview.ok).toBe(true)
    if (!preview.ok) return
    expect(preview.dryRun).toBe(true)
    expect(preview.upstreamFillId).toBe('88422')
    expect(preview.relation).toEqual({ kind: 'near-miss', reason: 'qty', orderFillId: '88422' })
    expect(markDistinct).not.toHaveBeenCalled()

    const applied = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        upstreamFillId: '88422',
        reason: 'next session, not this patch',
        confirmedDistinctBy: 'admin-1',
        dryRun: false,
      },
      { findManualFill, loadAccountFills, markDistinct },
    )
    expect(applied.ok).toBe(true)
    expect(markDistinct).toHaveBeenCalledTimes(1)
    expect(markDistinct.mock.calls[0][0]).toMatchObject({
      userId: 'user-1',
      accountNumber: base.accountNumber,
      fillId: 'manual-gap',
      upstreamFillId: '88422',
      confirmedDistinctBy: 'admin-1',
      confirmDistinctReason: 'next session, not this patch',
    })
  })

  it('parses --confirm-distinct as a preview unless --apply is set', () => {
    const preview = parseManualFillCliArgs([
      '--confirm-distinct',
      '--user-id',
      base.userId,
      '--account',
      base.accountNumber,
      '--fill-id',
      'manual-gap',
      '--upstream-fill-id',
      '88422',
      '--reason',
      'next session',
    ])
    expect(preview.ok).toBe(true)
    if (!preview.ok) return
    expect(preview.command).toBe('confirm-distinct')
    expect(preview.input.dryRun).toBe(true)
    const apply = parseManualFillCliArgs([
      '--confirm-distinct',
      '--apply',
      '--user-id',
      base.userId,
      '--account',
      base.accountNumber,
      '--fill-id',
      'manual-gap',
      '--upstream-fill-id',
      '88422',
      '--reason',
      'next session',
    ])
    expect(apply.ok).toBe(true)
    if (!apply.ok) return
    expect(apply.input.dryRun).toBe(false)
    expect(apply.input.upstreamFillId).toBe('88422')
    expect(apply.input.acknowledgeExactMatch).toBe(false)
    const acknowledged = parseManualFillCliArgs([
      '--confirm-distinct',
      '--apply',
      '--acknowledge-exact-match',
      '--acknowledge-unrelated',
      '--user-id',
      base.userId,
      '--account',
      base.accountNumber,
      '--fill-id',
      'manual-gap',
      '--upstream-fill-id',
      '88422',
      '--reason',
      'next session',
    ])
    expect(acknowledged.ok).toBe(true)
    if (!acknowledged.ok) return
    expect(acknowledged.input.acknowledgeExactMatch).toBe(true)
    expect(acknowledged.input.acknowledgeUnrelated).toBe(true)
    expect(acknowledged.input.acknowledgeAnnotatedTrades).toBe(false)
    expect(acknowledged.input.acknowledgeReapDeferred).toBe(false)
    const annotated = parseManualFillCliArgs([
      '--confirm-distinct',
      '--apply',
      '--acknowledge-annotated-trades',
      '--user-id',
      base.userId,
      '--account',
      base.accountNumber,
      '--fill-id',
      'manual-gap',
      '--upstream-fill-id',
      '88422',
      '--reason',
      'next session',
    ])
    expect(annotated.ok).toBe(true)
    if (!annotated.ok) return
    expect(annotated.input.acknowledgeAnnotatedTrades).toBe(true)
    const deferred = parseManualFillCliArgs([
      '--confirm-distinct',
      '--apply',
      '--acknowledge-reap-deferred',
      '--user-id',
      base.userId,
      '--account',
      base.accountNumber,
      '--fill-id',
      'manual-gap',
      '--upstream-fill-id',
      '88422',
      '--reason',
      'next session',
    ])
    expect(deferred.ok).toBe(true)
    if (!deferred.ok) return
    expect(deferred.input.acknowledgeReapDeferred).toBe(true)
    const remove = parseManualFillCliArgs([
      '--confirm-distinct',
      '--remove',
      '--apply',
      '--user-id',
      base.userId,
      '--account',
      base.accountNumber,
      '--fill-id',
      'manual-gap',
      '--upstream-fill-id',
      '1403850',
      '--reason',
      'drop this id only',
    ])
    expect(remove.ok).toBe(true)
    if (!remove.ok) return
    expect(remove.input.removeUpstreamFillId).toBe('1403850')
    expect(remove.input.upstreamFillId).toBeUndefined()
    expect(remove.input.dryRun).toBe(false)
    const bareRemove = parseManualFillCliArgs(['--remove', '--upstream-fill-id', '1403850'])
    expect(bareRemove.ok).toBe(false)
  })

  it('refuses a missing plant fill and an unacknowledged exact match', async () => {
    loadAccountFills.mockResolvedValue([manualRow])
    const missing = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        upstreamFillId: 'missing',
        reason: 'no such fill',
        dryRun: false,
      },
      { findManualFill, loadAccountFills, markDistinct },
    )
    expect(missing.ok).toBe(false)
    if (missing.ok) return
    expect(missing.status).toBe('not_found')
    expect(markDistinct).not.toHaveBeenCalled()

    loadAccountFills.mockResolvedValue([
      manualRow,
      { ...manualRow, fillId: '88421', source: 'history' },
    ])
    const exact = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        upstreamFillId: '88421',
        reason: 'this is the patch',
        dryRun: false,
      },
      { findManualFill, loadAccountFills, markDistinct },
    )
    expect(exact.ok).toBe(false)
    if (exact.ok) return
    expect(exact.status).toBe('acknowledgement_required')
    expect(exact.relation).toEqual({ kind: 'exact', orderFillId: '88421' })
    expect(markDistinct).not.toHaveBeenCalled()

    const acknowledged = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        upstreamFillId: '88421',
        reason: 'this is the patch',
        dryRun: false,
        acknowledgeExactMatch: true,
      },
      { findManualFill, loadAccountFills, markDistinct },
    )
    expect(acknowledged.ok).toBe(true)
    if (!acknowledged.ok) return
    expect(acknowledged.relation).toEqual({ kind: 'exact', orderFillId: '88421' })
    expect(markDistinct).toHaveBeenCalledTimes(1)
  })

  it('reports an unrelated plant fill on the same book', async () => {
    const unrelated = {
      ...manualRow,
      fillId: '7700',
      source: 'history',
      fillPrice: 1,
      fillDate: '20260901',
      ssboe: 1_700_000_000,
    }
    loadAccountFills.mockResolvedValue([manualRow, unrelated])
    const preview = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        upstreamFillId: '7700',
        reason: 'different execution',
      },
      { findManualFill, loadAccountFills, markDistinct },
    )
    expect(preview.ok).toBe(true)
    if (!preview.ok) return
    expect(preview.relation).toEqual({ kind: 'unrelated', orderFillId: '7700' })
    expect(preview.previousConfirmedDistinctFillId).toBeNull()
    expect(markDistinct).not.toHaveBeenCalled()
    const refused = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        upstreamFillId: '7700',
        reason: 'different execution',
        dryRun: false,
      },
      { findManualFill, loadAccountFills, markDistinct },
    )
    expect(refused.ok).toBe(false)
    if (refused.ok) return
    expect(refused.status).toBe('acknowledgement_required')
    expect(markDistinct).not.toHaveBeenCalled()
    const allowed = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        upstreamFillId: '7700',
        reason: 'different execution',
        dryRun: false,
        acknowledgeUnrelated: true,
      },
      { findManualFill, loadAccountFills, markDistinct },
    )
    expect(allowed.ok).toBe(true)
    expect(markDistinct).toHaveBeenCalledTimes(1)
  })

  it('judges a split plant order by the consolidated book', async () => {
    const pieceA = {
      ...manualRow,
      fillId: '9100',
      source: 'history',
      fillSize: 1,
      ssboe: manualRow.ssboe,
    }
    const pieceB = { ...pieceA, fillId: '9101', ssboe: manualRow.ssboe + 1 }
    loadAccountFills.mockResolvedValue([manualRow, pieceA, pieceB])
    const preview = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        upstreamFillId: '9100',
        reason: 'named a split piece',
      },
      { findManualFill, loadAccountFills, markDistinct },
    )
    expect(preview.ok).toBe(true)
    if (!preview.ok) return
    expect(preview.relation).toEqual({ kind: 'exact', orderFillId: '9101' })
  })

  it('still requires an exact acknowledgement when another manual is already marked distinct', async () => {
    const plant = { ...manualRow, fillId: '88421', source: 'history' }
    const earlier = {
      ...manualRow,
      fillId: 'manual-other',
      ssboe: manualRow.ssboe - 20,
      confirmedDistinctFillId: '88421',
    }
    loadAccountFills.mockResolvedValue([earlier, manualRow, plant])
    const preview = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        upstreamFillId: '88421',
        reason: 'the later twin',
      },
      { findManualFill, loadAccountFills, markDistinct },
    )
    expect(preview.ok).toBe(true)
    if (!preview.ok) return
    expect(preview.relation).toEqual({ kind: 'exact', orderFillId: '88421' })
    const refused = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        upstreamFillId: '88421',
        reason: 'the later twin',
        dryRun: false,
      },
      { findManualFill, loadAccountFills, markDistinct },
    )
    expect(refused.ok).toBe(false)
    if (refused.ok) return
    expect(refused.status).toBe('acknowledgement_required')
    expect(markDistinct).not.toHaveBeenCalled()
  })

  it('judges the picked split piece when that id is listed first on another symbol', async () => {
    const otherSymbol = {
      ...manualRow,
      fillId: '9100',
      source: 'history',
      symbol: 'MNQZ6',
      fillSize: 1,
    }
    const piece = {
      ...manualRow,
      fillId: '9100',
      source: 'history',
      fillSize: 1,
    }
    const largest = { ...piece, fillId: '9101', ssboe: manualRow.ssboe + 1 }
    loadAccountFills.mockResolvedValue([manualRow, otherSymbol, piece, largest])
    const preview = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        upstreamFillId: '9100',
        reason: 'named the smaller piece',
      },
      { findManualFill, loadAccountFills, markDistinct },
    )
    expect(preview.ok).toBe(true)
    if (!preview.ok) return
    expect(preview.relation).toEqual({ kind: 'exact', orderFillId: '9101' })
  })

  it('keeps a basket order together when its pieces are more than 2s apart', async () => {
    const early = {
      ...manualRow,
      fillId: '100',
      source: 'history',
      fillSize: 1,
      ssboe: manualRow.ssboe - 3,
      usecs: 0,
      basketId: 'basket-1',
    }
    const late = {
      ...early,
      fillId: '101',
      ssboe: manualRow.ssboe,
      usecs: 250_000,
    }
    loadAccountFills.mockResolvedValue([manualRow, early, late])
    const applied = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        upstreamFillId: '101',
        reason: 'basket piece',
        dryRun: false,
      },
      { findManualFill, loadAccountFills, markDistinct },
    )
    expect(applied.ok).toBe(false)
    if (applied.ok) return
    expect(applied.status).toBe('acknowledgement_required')
    expect(applied.relation).toEqual({ kind: 'exact', orderFillId: '101' })
    expect(markDistinct).not.toHaveBeenCalled()
  })

  it('treats a chained piece more than 2s from the first as that order', async () => {
    const manual = { ...manualRow, fillSize: 3, ssboe: manualRow.ssboe + 4 }
    findManualFill.mockResolvedValue(manual)
    const first = {
      ...manualRow,
      fillId: '300',
      source: 'history',
      fillSize: 1,
      ssboe: manualRow.ssboe,
    }
    const middle = { ...first, fillId: '100', ssboe: manualRow.ssboe + 2 }
    const end = { ...first, fillId: '200', ssboe: manualRow.ssboe + 4 }
    loadAccountFills.mockResolvedValue([manual, first, middle, end])
    const preview = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        upstreamFillId: '200',
        reason: 'end of a chained order',
      },
      { findManualFill, loadAccountFills, markDistinct },
    )
    expect(preview.ok).toBe(true)
    if (!preview.ok) return
    expect(preview.relation).toEqual({ kind: 'exact', orderFillId: '300' })
  })

  it('refuses confirm-distinct when re-pairing would leave an annotated manual trade', async () => {
    const ssboe = manualRow.ssboe
    const plant = {
      accountId: base.accountNumber,
      symbol: 'MESZ6',
      transactionType: 'BUY',
      fillPrice: 5810.25,
      fillSize: 2,
      fillId: '88421',
      fillDate: '20260925',
      ssboe: ssboe - 45,
      source: 'history' as const,
    }
    const manual = {
      ...plant,
      fillId: 'manual-gap',
      ssboe,
      source: 'manual' as const,
      confirmedDistinctFillId: '88421',
    }
    const close = {
      ...plant,
      transactionType: 'SELL',
      fillPrice: 5810.5,
      fillId: '1002',
      ssboe: ssboe + 75,
    }
    const extraClose = { ...close, fillPrice: 5811, fillId: '1003', ssboe: ssboe + 180 }
    const prepared = prepareRithmicProtocolFills([plant, manual, close, extraClose])
    const { trades } = buildTradesFromRithmicFills(
      prepared.fills,
      'user-1',
      new Map([['MES', { tickSize: 0.25, tickValue: 1.25 }]]),
    )
    expect(trades.map((trade) => [trade.entryId, trade.closeId])).toEqual([
      ['88421', '1002'],
      ['manual-gap', '1003'],
    ])
    const stored = {
      id: 'stored-manual-trade',
      accountNumber: base.accountNumber,
      instrument: 'MES',
      side: 'Long',
      quantity: 2,
      entryPrice: '5810.25',
      closePrice: '5810.5',
      entryDate: new Date(ssboe * 1000).toISOString(),
      closeDate: new Date((ssboe + 75) * 1000).toISOString(),
      entryId: 'manual-gap',
      closeId: '1002',
      comment: 'kept note',
      tags: [RITHMIC_PROTOCOL_TRADE_TAG],
    }
    expect(
      countDistinctManualTradesKept({
        existing: [stored],
        derived: trades,
        ledgerFillIds: new Set(['manual-gap', '88421', '1002', '1003']),
        distinctPlantIdByManualFillId: new Map([['manual-gap', '88421']]),
      }),
    ).toBe(0)
    const findDerivedTrades = vi.fn(async () => [
      {
        id: 'stored-manual-trade',
        entryId: '88421',
        closeId: '1002',
        instrument: 'MES',
        annotated: true,
      },
    ])
    loadAccountFills.mockResolvedValue([
      manualRow,
      { ...manualRow, fillId: '88421', source: 'history', ssboe: ssboe + 10 },
      { ...manualRow, fillId: '1002', source: 'history', transactionType: 'SELL', fillPrice: 5810.5, ssboe: ssboe + 80 },
      { ...manualRow, fillId: '1003', source: 'history', transactionType: 'SELL', fillPrice: 5811, ssboe: ssboe + 200 },
    ])
    const refused = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        upstreamFillId: '88421',
        reason: 'the plant fill is a different buy',
        dryRun: false,
        acknowledgeExactMatch: true,
      },
      { findManualFill, loadAccountFills, markDistinct, findDerivedTrades },
    )
    expect(refused.ok).toBe(false)
    if (refused.ok) return
    expect(refused.status).toBe('acknowledgement_required')
    expect(refused.errors[0]?.field).toBe('acknowledgeAnnotatedTrades')
    expect(refused.trades?.map((trade) => trade.id)).toEqual(['stored-manual-trade'])
    expect(markDistinct).not.toHaveBeenCalled()
    const allowed = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        upstreamFillId: '88421',
        reason: 'the plant fill is a different buy',
        dryRun: false,
        acknowledgeExactMatch: true,
        acknowledgeAnnotatedTrades: true,
      },
      { findManualFill, loadAccountFills, markDistinct, findDerivedTrades },
    )
    expect(allowed.ok).toBe(true)
    expect(markDistinct).toHaveBeenCalledTimes(1)
  })

  it('refuses confirm-distinct when an annotated trade is on the plant leg', async () => {
    const ssboe = manualRow.ssboe
    const manual = {
      accountId: base.accountNumber,
      symbol: 'MESZ6',
      transactionType: 'BUY',
      fillPrice: 5810.25,
      fillSize: 2,
      fillId: 'manual-gap',
      fillDate: '20260925',
      ssboe,
      source: 'manual' as const,
      confirmedDistinctFillId: '88421',
    }
    const plant = {
      ...manual,
      fillId: '88421',
      ssboe: ssboe + 10,
      source: 'history' as const,
      confirmedDistinctFillId: undefined,
    }
    const close = {
      ...plant,
      transactionType: 'SELL',
      fillPrice: 5810.5,
      fillId: '1002',
      ssboe: ssboe + 80,
    }
    const extraClose = { ...close, fillPrice: 5811, fillId: '1003', ssboe: ssboe + 200 }
    const prepared = prepareRithmicProtocolFills([manual, plant, close, extraClose])
    const { trades } = buildTradesFromRithmicFills(
      prepared.fills,
      'user-1',
      new Map([['MES', { tickSize: 0.25, tickValue: 1.25 }]]),
    )
    expect(trades.map((trade) => [trade.entryId, trade.closeId])).toEqual([
      ['manual-gap', '1002'],
      ['88421', '1003'],
    ])
    const findDerivedTrades = vi.fn(
      async (params: { fillId?: string; fillIds?: string[] }) => {
        const ids = new Set([
          ...(params.fillIds ?? []),
          ...(params.fillId ? [params.fillId] : []),
        ])
        if (ids.size > 0 && !ids.has('88421')) return []
        return [
          {
            id: 'stored-plant-trade',
            entryId: '88421',
            closeId: '1002',
            instrument: 'MES',
            annotated: true,
          },
        ]
      },
    )
    loadAccountFills.mockResolvedValue([
      manualRow,
      { ...manualRow, fillId: '88421', source: 'history', ssboe: ssboe + 10 },
      {
        ...manualRow,
        fillId: '1002',
        source: 'history',
        transactionType: 'SELL',
        fillPrice: 5810.5,
        ssboe: ssboe + 80,
      },
      {
        ...manualRow,
        fillId: '1003',
        source: 'history',
        transactionType: 'SELL',
        fillPrice: 5811,
        ssboe: ssboe + 200,
      },
    ])
    const refused = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        upstreamFillId: '88421',
        reason: 'count the manual beside the plant fill',
        dryRun: false,
        acknowledgeExactMatch: true,
      },
      { findManualFill, loadAccountFills, markDistinct, findDerivedTrades },
    )
    expect(refused.ok).toBe(false)
    if (refused.ok) return
    expect(refused.status).toBe('acknowledgement_required')
    expect(refused.errors[0]?.field).toBe('acknowledgeAnnotatedTrades')
    expect(refused.trades?.map((trade) => trade.id)).toEqual(['stored-plant-trade'])
    expect(markDistinct).not.toHaveBeenCalled()
  })

  it('gates an annotated trade when removing the marker frees that plant fill', async () => {
    const ssboe = manualRow.ssboe
    findManualFill.mockResolvedValue({
      ...manualRow,
      confirmedDistinctFillId: '88421',
      confirmedDistinctAt: new Date('2026-09-01T00:00:00Z'),
    })
    loadAccountFills.mockResolvedValue([
      { ...manualRow, confirmedDistinctFillId: '88421' },
      { ...manualRow, fillId: '88421', source: 'history', ssboe: ssboe + 10 },
      {
        ...manualRow,
        fillId: '1002',
        source: 'history',
        transactionType: 'SELL',
        ssboe: ssboe + 60,
      },
      {
        ...manualRow,
        fillId: '1003',
        source: 'history',
        transactionType: 'SELL',
        ssboe: ssboe + 70,
      },
      {
        ...manualRow,
        fillId: '7700',
        source: 'history',
        fillPrice: 1,
        fillDate: '20260901',
        ssboe: ssboe + 86_400,
      },
    ])
    const findDerivedTrades = vi.fn(
      async (params: { fillIds?: string[] }) => {
        if ((params.fillIds?.length ?? 0) > 0) return []
        return [
          {
            id: 'stored-manual',
            entryId: 'manual-gap',
            closeId: '1002',
            instrument: 'MES',
            annotated: false,
          },
          {
            id: 'stored-freed',
            entryId: '88421',
            closeId: '1003',
            instrument: 'MES',
            annotated: true,
          },
        ]
      },
    )
    const refused = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        removeUpstreamFillId: '88421',
        reason: 'point the marker at a different fill',
        dryRun: false,
      },
      { findManualFill, loadAccountFills, markDistinct, findDerivedTrades },
    )
    expect(refused.ok).toBe(false)
    if (refused.ok) return
    expect(refused.errors[0]?.field).toBe('acknowledgeAnnotatedTrades')
    expect(refused.trades?.map((trade) => trade.id)).toEqual(['stored-freed', 'stored-manual'])
    expect(refused.tradeEffects).toEqual({
      displaced: 2,
      annotated: 1,
      nextBookBlocked: false,
      reapDeferred: false,
    })
    expect(markDistinct).not.toHaveBeenCalled()
  })

  it('gates the old pair when removing the marker lets the plant fill match exactly', async () => {
    const ssboe = manualRow.ssboe
    findManualFill.mockResolvedValue({
      ...manualRow,
      confirmedDistinctFillId: '88421',
      confirmedDistinctAt: new Date('2026-09-01T00:00:00Z'),
    })
    loadAccountFills.mockResolvedValue([
      { ...manualRow, confirmedDistinctFillId: '88421' },
      { ...manualRow, fillId: '88421', source: 'history', ssboe: ssboe + 10 },
      {
        ...manualRow,
        fillId: '1002',
        source: 'history',
        transactionType: 'SELL',
        ssboe: ssboe + 60,
      },
      {
        ...manualRow,
        fillId: '1003',
        source: 'history',
        transactionType: 'SELL',
        ssboe: ssboe + 70,
      },
      {
        ...manualRow,
        fillId: '7700',
        source: 'history',
        fillPrice: 1,
        fillDate: '20260901',
        ssboe: ssboe + 86_400,
      },
    ])
    const findDerivedTrades = vi.fn(async () => [
      {
        id: 'stored-new',
        entryId: '88421',
        closeId: '1002',
        instrument: 'MES',
        annotated: false,
      },
      {
        id: 'stored-freed',
        entryId: '88421',
        closeId: '1003',
        instrument: 'MES',
        annotated: true,
      },
    ])
    const refused = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        removeUpstreamFillId: '88421',
        reason: 'let the earlier plant fill take the close',
        dryRun: false,
      },
      { findManualFill, loadAccountFills, markDistinct, findDerivedTrades },
    )
    expect(refused.ok).toBe(false)
    if (refused.ok) return
    expect(refused.errors[0]?.field).toBe('acknowledgeAnnotatedTrades')
    expect(refused.trades?.map((trade) => trade.id)).toEqual(['stored-freed'])
    expect(refused.tradeEffects?.nextBookBlocked).toBe(false)
    expect(markDistinct).not.toHaveBeenCalled()
  })

  it('refuses a near-miss on a later contract when an earlier month is clean', async () => {
    const ssboe = manualRow.ssboe
    findManualFill.mockResolvedValue({ ...manualRow, symbol: 'MESH7' })
    loadAccountFills.mockResolvedValue([
      {
        ...manualRow,
        fillId: 'manual-old',
        ssboe: ssboe - 86_400,
      },
      {
        ...manualRow,
        fillId: '2002',
        source: 'history',
        transactionType: 'SELL',
        ssboe: ssboe - 86_400 + 60,
      },
      { ...manualRow, fillId: 'manual-gap', symbol: 'MESH7' },
      {
        ...manualRow,
        fillId: '88421',
        symbol: 'MESH7',
        source: 'history',
        ssboe: ssboe - 45,
      },
      {
        ...manualRow,
        fillId: '1002',
        symbol: 'MESH7',
        source: 'history',
        transactionType: 'SELL',
        fillPrice: 5810.5,
        ssboe: ssboe + 75,
      },
      {
        ...manualRow,
        fillId: '1003',
        symbol: 'MESH7',
        source: 'history',
        transactionType: 'SELL',
        fillPrice: 5811,
        ssboe: ssboe + 180,
      },
    ])
    const findDerivedTrades = vi.fn(async () => [
      {
        id: 'stored-manual-trade',
        entryId: 'manual-gap',
        closeId: '1002',
        instrument: 'MES',
        annotated: true,
      },
    ])
    const refused = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        upstreamFillId: '88421',
        reason: 'later month near-miss',
        dryRun: false,
      },
      { findManualFill, loadAccountFills, markDistinct, findDerivedTrades },
    )
    expect(refused.ok).toBe(false)
    if (refused.ok) return
    expect(refused.relation?.kind).toBe('near-miss')
    expect(refused.errors[0]?.field).toBe('acknowledgeAnnotatedTrades')
    expect(refused.trades?.map((trade) => trade.id)).toEqual(['stored-manual-trade'])
    expect(markDistinct).not.toHaveBeenCalled()
  })

  it('refuses confirm-distinct while another symbol on the account still has a near-miss', async () => {
    const ssboe = manualRow.ssboe
    loadAccountFills.mockResolvedValue([
      manualRow,
      { ...manualRow, fillId: '88421', source: 'history', ssboe: ssboe - 45 },
      {
        ...manualRow,
        fillId: '1002',
        source: 'history',
        transactionType: 'SELL',
        fillPrice: 5810.5,
        ssboe: ssboe + 75,
      },
      {
        ...manualRow,
        fillId: '1003',
        source: 'history',
        transactionType: 'SELL',
        fillPrice: 5811,
        ssboe: ssboe + 180,
      },
      {
        ...manualRow,
        fillId: 'manual-other',
        symbol: 'MNQH7',
        ssboe: ssboe - 86_400,
      },
      {
        ...manualRow,
        fillId: '99001',
        symbol: 'MNQH7',
        source: 'history',
        ssboe: ssboe - 86_400 - 45,
      },
    ])
    const findDerivedTrades = vi.fn(async () => [
      {
        id: 'stored-manual-trade',
        entryId: 'manual-gap',
        closeId: '1002',
        instrument: 'MES',
        annotated: false,
      },
    ])
    const input = {
      userId: 'user-1',
      accountNumber: base.accountNumber,
      fillId: 'manual-gap',
      upstreamFillId: '88421',
      reason: 'this near-miss is a different buy',
    }
    const preview = await confirmDistinctManualRithmicProtocolFill(input, {
      findManualFill,
      loadAccountFills,
      markDistinct,
      findDerivedTrades,
    })
    expect(preview.ok).toBe(true)
    if (!preview.ok) return
    expect(preview.dryRun).toBe(true)
    expect(preview.relation.kind).toBe('near-miss')
    expect(preview.tradeEffects).toEqual({
      displaced: 1,
      annotated: 0,
      nextBookBlocked: false,
      reapDeferred: true,
    })
    expect(markDistinct).not.toHaveBeenCalled()
    const refused = await confirmDistinctManualRithmicProtocolFill(
      { ...input, dryRun: false },
      { findManualFill, loadAccountFills, markDistinct, findDerivedTrades },
    )
    expect(refused.ok).toBe(false)
    if (refused.ok) return
    expect(refused.errors[0]?.field).toBe('acknowledgeReapDeferred')
    expect(refused.trades?.map((trade) => trade.id)).toEqual(['stored-manual-trade'])
    expect(refused.tradeEffects).toEqual({
      displaced: 1,
      annotated: 0,
      nextBookBlocked: false,
      reapDeferred: true,
    })
    expect(markDistinct).not.toHaveBeenCalled()
    const allowed = await confirmDistinctManualRithmicProtocolFill(
      { ...input, dryRun: false, acknowledgeReapDeferred: true },
      { findManualFill, loadAccountFills, markDistinct, findDerivedTrades },
    )
    expect(allowed.ok).toBe(true)
    if (!allowed.ok) return
    expect(allowed.tradeEffects.reapDeferred).toBe(true)
    expect(markDistinct).toHaveBeenCalledTimes(1)
  })

  it('gates an annotated trade shifted by a cascading re-pair', async () => {
    const ssboe = manualRow.ssboe
    const one = { ...manualRow, fillSize: 1 }
    findManualFill.mockResolvedValue(one)
    loadAccountFills.mockResolvedValue([
      { ...one, ssboe },
      { ...one, fillId: '88421', source: 'history', ssboe: ssboe + 10 },
      { ...one, fillId: '88422', source: 'history', ssboe: ssboe + 150 },
      {
        ...one,
        fillId: '1002',
        source: 'history',
        transactionType: 'SELL',
        ssboe: ssboe + 200,
      },
      {
        ...one,
        fillId: '1003',
        source: 'history',
        transactionType: 'SELL',
        ssboe: ssboe + 210,
      },
      {
        ...one,
        fillId: '1004',
        source: 'history',
        transactionType: 'SELL',
        ssboe: ssboe + 220,
      },
    ])
    const findDerivedTrades = vi.fn(async (params: { fillIds?: string[] }) => {
      if ((params.fillIds?.length ?? 0) > 0) return []
      return [
        {
          id: 'stored-pc',
          entryId: '88421',
          closeId: '1002',
          instrument: 'MES',
          annotated: false,
        },
        {
          id: 'stored-qx',
          entryId: '88422',
          closeId: '1003',
          instrument: 'MES',
          annotated: true,
        },
      ]
    })
    const refused = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        upstreamFillId: '88421',
        reason: 'keep this manual in front of the book',
        dryRun: false,
        acknowledgeExactMatch: true,
      },
      { findManualFill, loadAccountFills, markDistinct, findDerivedTrades },
    )
    expect(refused.ok).toBe(false)
    if (refused.ok) return
    expect(refused.errors[0]?.field).toBe('acknowledgeAnnotatedTrades')
    expect(refused.trades?.map((trade) => trade.id)).toEqual(['stored-pc', 'stored-qx'])
    expect(refused.tradeEffects).toEqual({
      displaced: 2,
      annotated: 1,
      nextBookBlocked: false,
      reapDeferred: false,
    })
    expect(markDistinct).not.toHaveBeenCalled()
  })

  it('refuses a near-miss confirm-distinct while an annotated manual trade is stored', async () => {
    const ssboe = manualRow.ssboe
    loadAccountFills.mockResolvedValue([
      manualRow,
      { ...manualRow, fillId: '88421', source: 'history', ssboe: ssboe - 45 },
      {
        ...manualRow,
        fillId: '1002',
        source: 'history',
        transactionType: 'SELL',
        fillPrice: 5810.5,
        ssboe: ssboe + 75,
      },
      {
        ...manualRow,
        fillId: '1003',
        source: 'history',
        transactionType: 'SELL',
        fillPrice: 5811,
        ssboe: ssboe + 180,
      },
    ])
    const findDerivedTrades = vi.fn(async () => [
      {
        id: 'stored-manual-trade',
        entryId: 'manual-gap',
        closeId: '1002',
        instrument: 'MES',
        annotated: true,
      },
    ])
    const refused = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        upstreamFillId: '88421',
        reason: 'the plant fill is a different buy',
        dryRun: false,
      },
      { findManualFill, loadAccountFills, markDistinct, findDerivedTrades },
    )
    expect(refused.ok).toBe(false)
    if (refused.ok) return
    expect(refused.relation?.kind).toBe('near-miss')
    expect(refused.errors[0]?.field).toBe('acknowledgeAnnotatedTrades')
    expect(refused.trades?.map((trade) => trade.id)).toEqual(['stored-manual-trade'])
    expect(refused.tradeEffects).toEqual({
      displaced: 1,
      annotated: 1,
      nextBookBlocked: false,
      reapDeferred: false,
    })
    expect(markDistinct).not.toHaveBeenCalled()
  })

  it('gates an annotated trade when removing a marker frees the previous plant fill', async () => {
    const ssboe = manualRow.ssboe
    findManualFill.mockResolvedValue({
      ...manualRow,
      confirmedDistinctFillId: '88421',
      confirmedDistinctAt: new Date('2026-09-01T00:00:00Z'),
    })
    loadAccountFills.mockResolvedValue([
      { ...manualRow, confirmedDistinctFillId: '88421' },
      { ...manualRow, fillId: '88421', source: 'history', ssboe: ssboe + 90 },
      {
        ...manualRow,
        fillId: '1002',
        source: 'history',
        transactionType: 'SELL',
        ssboe: ssboe + 60,
      },
      {
        ...manualRow,
        fillId: '1003',
        source: 'history',
        transactionType: 'SELL',
        ssboe: ssboe + 70,
      },
      { ...manualRow, fillId: '7700', source: 'history', ssboe: ssboe - 40 },
    ])
    const findDerivedTrades = vi.fn(async () => [
      {
        id: 'stored-freed',
        entryId: '88421',
        closeId: '1003',
        instrument: 'MES',
        annotated: true,
      },
    ])
    const refused = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        removeUpstreamFillId: '88421',
        reason: 'point the marker at the near-miss',
        dryRun: false,
      },
      { findManualFill, loadAccountFills, markDistinct, findDerivedTrades },
    )
    expect(refused.ok).toBe(false)
    if (refused.ok) return
    expect(refused.removedUpstreamFillId).toBe('88421')
    expect(refused.confirmedDistinctFillIds).toEqual([])
    expect(refused.errors[0]?.field).toBe('acknowledgeAnnotatedTrades')
    expect(refused.trades?.map((trade) => trade.id)).toEqual(['stored-freed'])
    expect(refused.tradeEffects?.nextBookBlocked).toBe(true)
    expect(markDistinct).not.toHaveBeenCalled()
  })

  it('gates an annotated trade shifted by a near-miss cascade', async () => {
    const ssboe = manualRow.ssboe
    const one = { ...manualRow, fillSize: 1 }
    findManualFill.mockResolvedValue(one)
    loadAccountFills.mockResolvedValue([
      { ...one, ssboe },
      { ...one, fillId: '88421', source: 'history', ssboe: ssboe + 45 },
      { ...one, fillId: '88422', source: 'history', ssboe: ssboe + 150 },
      {
        ...one,
        fillId: '1002',
        source: 'history',
        transactionType: 'SELL',
        ssboe: ssboe + 200,
      },
      {
        ...one,
        fillId: '1003',
        source: 'history',
        transactionType: 'SELL',
        ssboe: ssboe + 210,
      },
      {
        ...one,
        fillId: '1004',
        source: 'history',
        transactionType: 'SELL',
        ssboe: ssboe + 220,
      },
    ])
    const findDerivedTrades = vi.fn(async () => [
      {
        id: 'stored-qx',
        entryId: '88422',
        closeId: '1003',
        instrument: 'MES',
        annotated: true,
      },
    ])
    const refused = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        upstreamFillId: '88421',
        reason: 'keep this manual in front of the book',
        dryRun: false,
      },
      { findManualFill, loadAccountFills, markDistinct, findDerivedTrades },
    )
    expect(refused.ok).toBe(false)
    if (refused.ok) return
    expect(refused.relation?.kind).toBe('near-miss')
    expect(refused.errors[0]?.field).toBe('acknowledgeAnnotatedTrades')
    expect(refused.trades?.map((trade) => trade.id)).toEqual(['stored-qx'])
    expect(markDistinct).not.toHaveBeenCalled()
  })

  it('reports an exact twin when an earlier session reused its fill id', async () => {
    const earlier = {
      ...manualRow,
      fillId: '88421',
      source: 'history',
      fillSize: 1,
      fillDate: '20260924',
      ssboe: manualRow.ssboe - 86_400,
    }
    const earlierOther = {
      ...earlier,
      fillId: '90000',
      ssboe: manualRow.ssboe - 86_400 + 1,
    }
    const twin = {
      ...manualRow,
      fillId: '88421',
      source: 'history',
    }
    loadAccountFills.mockResolvedValue([manualRow, earlier, earlierOther, twin])
    const preview = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        upstreamFillId: '88421',
        reason: 'recycled fill id',
      },
      { findManualFill, loadAccountFills, markDistinct },
    )
    expect(preview.ok).toBe(true)
    if (!preview.ok) return
    expect(preview.relation).toEqual({ kind: 'exact', orderFillId: '88421' })

    const recycledPiece = {
      ...manualRow,
      fillId: '9100',
      source: 'history',
      fillSize: 1,
      fillDate: '20260924',
      ssboe: manualRow.ssboe - 86_400,
    }
    const recycledOrder = {
      ...recycledPiece,
      fillId: '90000',
      ssboe: manualRow.ssboe - 86_400 + 1,
    }
    const piece = {
      ...manualRow,
      fillId: '9100',
      source: 'history',
      fillSize: 1,
    }
    const largest = { ...piece, fillId: '9101', ssboe: manualRow.ssboe + 1 }
    loadAccountFills.mockResolvedValue([
      manualRow,
      recycledPiece,
      recycledOrder,
      piece,
      largest,
    ])
    const namedPiece = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        upstreamFillId: '9100',
        reason: 'recycled split piece',
      },
      { findManualFill, loadAccountFills, markDistinct },
    )
    expect(namedPiece.ok).toBe(true)
    if (!namedPiece.ok) return
    expect(namedPiece.relation).toEqual({ kind: 'exact', orderFillId: '9101' })
  })

  it('stores a split piece as the consolidated order id', async () => {
    const pieceA = {
      ...manualRow,
      fillId: '9100',
      source: 'history',
      fillSize: 1,
      ssboe: manualRow.ssboe,
    }
    const pieceB = { ...pieceA, fillId: '9101', ssboe: manualRow.ssboe + 1 }
    findManualFill.mockResolvedValue({ ...manualRow, fillSize: 3 })
    loadAccountFills.mockResolvedValue([
      { ...manualRow, fillSize: 3 },
      pieceA,
      pieceB,
    ])
    const applied = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        upstreamFillId: '9100',
        reason: 'named a split piece',
        dryRun: false,
      },
      { findManualFill, loadAccountFills, markDistinct },
    )
    expect(applied.ok).toBe(true)
    if (!applied.ok) return
    expect(applied.relation).toEqual({
      kind: 'near-miss',
      reason: 'qty',
      orderFillId: '9101',
    })
    expect(applied.upstreamFillId).toBe('9101')
    expect(markDistinct.mock.calls[0][0].upstreamFillId).toBe('9101')
    const prepared = prepareRithmicProtocolFills([
      {
        accountId: base.accountNumber,
        symbol: 'MESZ6',
        transactionType: 'BUY',
        fillPrice: 5810.25,
        fillSize: 3,
        fillId: 'manual-gap',
        fillDate: '20260925',
        fillTime: '15:07:00',
        ssboe: manualRow.ssboe,
        source: 'manual',
        confirmedDistinctFillId: '9101',
      },
      {
        accountId: base.accountNumber,
        symbol: 'MESZ6',
        transactionType: 'BUY',
        fillPrice: 5810.25,
        fillSize: 1,
        fillId: '9100',
        fillDate: '20260925',
        ssboe: manualRow.ssboe,
        source: 'history',
      },
      {
        accountId: base.accountNumber,
        symbol: 'MESZ6',
        transactionType: 'BUY',
        fillPrice: 5810.25,
        fillSize: 1,
        fillId: '9101',
        fillDate: '20260925',
        ssboe: manualRow.ssboe + 1,
        source: 'history',
      },
    ])
    expect(prepared.nearMisses).toEqual([])
    expect(prepared.retirements).toEqual([])
    expect(prepared.fills.some((fill) => fill.fillId === 'manual-gap')).toBe(true)
  })

  it('appends a later confirm-distinct instead of replacing the first id', async () => {
    findManualFill.mockResolvedValue({
      ...manualRow,
      confirmedDistinctFillId: '7700',
      confirmedDistinctFillIds: ['7700'],
      confirmedDistinctAt: new Date('2026-09-01T00:00:00Z'),
    })
    loadAccountFills.mockResolvedValue([
      {
        ...manualRow,
        confirmedDistinctFillId: '7700',
        confirmedDistinctFillIds: ['7700'],
      },
      nearMiss,
      { ...nearMiss, fillId: '7700', fillPrice: 1, fillDate: '20260901', ssboe: 1_700_000_000 },
    ])
    const applied = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        upstreamFillId: '88422',
        reason: 'also distinct from the second fill',
        dryRun: false,
        acknowledgeUnrelated: true,
      },
      { findManualFill, loadAccountFills, markDistinct },
    )
    expect(applied.ok).toBe(true)
    if (!applied.ok) return
    expect(applied.previousConfirmedDistinctFillId).toBe('7700')
    expect(applied.previousConfirmedDistinctFillIds).toEqual(['7700'])
    expect(applied.idempotent).toBe(false)
    expect(applied.upstreamFillId).toBe('88422')
    expect(applied.addedUpstreamFillIds).toEqual(['88422'])
    expect(applied.confirmedDistinctFillIds).toEqual(['7700', '88422'])
    expect(markDistinct).toHaveBeenCalledTimes(1)
    expect(markDistinct.mock.calls[0][0].confirmedDistinctFillIds).toEqual(['7700', '88422'])
  })

  it('confirms several plant fills, dedupes repeats, and keeps both ids', async () => {
    const manual = { ...manualRow, fillPrice: 7777, fillSize: 2 }
    const first = { ...nearMiss, fillId: '1403850', fillPrice: 7777 }
    const second = {
      ...nearMiss,
      fillId: '1402237',
      fillPrice: 7777.25,
      ssboe: manualRow.ssboe + 30,
    }
    findManualFill.mockResolvedValue(manual)
    loadAccountFills.mockResolvedValue([manual, first, second])
    const deduped = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        upstreamFillId: '1403850',
        upstreamFillIds: ['1403850', '1403850'],
        reason: 'manual BUY 2 @7777 is not fill 1403850',
        dryRun: false,
      },
      { findManualFill, loadAccountFills, markDistinct },
    )
    expect(deduped.ok).toBe(true)
    if (!deduped.ok) return
    expect(deduped.addedUpstreamFillIds).toEqual(['1403850'])
    expect(deduped.confirmedDistinctFillIds).toEqual(['1403850'])
    expect(markDistinct).toHaveBeenCalledTimes(1)

    const marked = {
      ...manual,
      confirmedDistinctFillId: '1403850',
      confirmedDistinctFillIds: ['1403850'],
      confirmedDistinctAt: new Date('2026-11-16T12:00:00Z'),
    }
    findManualFill.mockResolvedValue(marked)
    loadAccountFills.mockResolvedValue([marked, first, second])
    const secondConfirm = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        upstreamFillId: '1402237',
        reason: 'manual BUY 2 @7777 is not fill 1402237 either',
        dryRun: false,
      },
      { findManualFill, loadAccountFills, markDistinct },
    )
    expect(secondConfirm.ok).toBe(true)
    if (!secondConfirm.ok) return
    expect(secondConfirm.relation.kind).toBe('near-miss')
    expect(secondConfirm.idempotent).toBe(false)
    expect(secondConfirm.previousConfirmedDistinctFillIds).toEqual(['1403850'])
    expect(secondConfirm.addedUpstreamFillIds).toEqual(['1402237'])
    expect(secondConfirm.confirmedDistinctFillIds).toEqual(['1403850', '1402237'])
    expect(markDistinct.mock.calls[1][0].confirmedDistinctFillIds).toEqual([
      '1403850',
      '1402237',
    ])

    findManualFill.mockResolvedValue({
      ...marked,
      confirmedDistinctFillId: '1402237',
      confirmedDistinctFillIds: ['1403850', '1402237'],
      confirmedDistinctBy: 'admin-1',
      confirmDistinctReason: 'manual BUY 2 @7777 is not fill 1402237 either',
    })
    const repeat = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        upstreamFillId: '1403850',
        reason: 'already confirmed',
        dryRun: false,
      },
      { findManualFill, loadAccountFills, markDistinct },
    )
    expect(repeat.ok).toBe(true)
    if (!repeat.ok) return
    expect(repeat.idempotent).toBe(true)
    expect(repeat.addedUpstreamFillIds).toEqual([])
    expect(repeat.confirmedDistinctFillIds).toEqual(['1403850', '1402237'])
    expect(markDistinct).toHaveBeenCalledTimes(2)

    findManualFill.mockResolvedValue(manual)
    loadAccountFills.mockResolvedValue([manual, first, second])
    markDistinct.mockClear()
    const together = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        upstreamFillIds: ['1403850', '1402237'],
        reason: 'both plant fills are different executions',
        dryRun: false,
      },
      { findManualFill, loadAccountFills, markDistinct },
    )
    expect(together.ok).toBe(true)
    if (!together.ok) return
    expect(together.confirmedDistinctFillIds).toEqual(['1403850', '1402237'])
    expect(markDistinct.mock.calls[0][0].confirmedDistinctFillIds).toEqual([
      '1403850',
      '1402237',
    ])
  })

  it('removes one confirmed id and leaves the others', async () => {
    findManualFill.mockResolvedValue({
      ...manualRow,
      confirmedDistinctFillId: '1402237',
      confirmedDistinctFillIds: ['1403850', '1402237'],
      confirmedDistinctAt: new Date('2026-11-16T12:00:00Z'),
    })
    loadAccountFills.mockResolvedValue([
      {
        ...manualRow,
        confirmedDistinctFillId: '1402237',
        confirmedDistinctFillIds: ['1403850', '1402237'],
      },
      { ...nearMiss, fillId: '1403850' },
      { ...nearMiss, fillId: '1402237', fillPrice: 7777.25 },
    ])
    const removed = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        removeUpstreamFillId: '1403850',
        reason: 'that one was the same execution',
        dryRun: false,
      },
      { findManualFill, loadAccountFills, markDistinct },
    )
    expect(removed.ok).toBe(true)
    if (!removed.ok) return
    expect(removed.removedUpstreamFillId).toBe('1403850')
    expect(removed.confirmedDistinctFillIds).toEqual(['1402237'])
    expect(removed.addedUpstreamFillIds).toEqual([])
    expect(markDistinct.mock.calls[0][0].confirmedDistinctFillIds).toEqual(['1402237'])

    const missing = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        removeUpstreamFillId: '9999',
        reason: 'not on the row',
        dryRun: false,
      },
      { findManualFill, loadAccountFills, markDistinct },
    )
    expect(missing.ok).toBe(false)
    if (missing.ok) return
    expect(missing.status).toBe('not_found')
    expect(markDistinct).toHaveBeenCalledTimes(1)
  })

  it('ignores a same fill id on another symbol', async () => {
    loadAccountFills.mockResolvedValue([
      manualRow,
      {
        ...manualRow,
        fillId: '88422',
        source: 'history',
        symbol: 'MNQZ6',
      },
    ])
    const missing = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        upstreamFillId: '88422',
        reason: 'wrong symbol',
        dryRun: false,
      },
      { findManualFill, loadAccountFills, markDistinct },
    )
    expect(missing.ok).toBe(false)
    if (missing.ok) return
    expect(missing.status).toBe('not_found')
    expect(markDistinct).not.toHaveBeenCalled()
  })

  it('puts an acknowledged exact match last and refuses a second one', async () => {
    const near = {
      ...manualRow,
      fillId: '1402237',
      source: 'history',
      fillSize: 1,
      fillPrice: 5811,
    }
    const exact = { ...manualRow, fillId: '1403850', source: 'history' }
    const otherExact = {
      ...manualRow,
      fillId: '88421',
      source: 'history',
      ssboe: manualRow.ssboe + 10,
    }
    const kept = { op: 'note', text: 'kept in order' }
    findManualFill.mockResolvedValue({
      ...manualRow,
      confirmedDistinctFillId: '1403850',
      confirmedDistinctFillIds: ['1403850'],
      confirmedDistinctAt: new Date('2026-11-16T12:00:00Z'),
      confirmedDistinctBy: 'prior-admin',
      confirmDistinctReason: 'original exact confirm',
      confirmedDistinctAudit: [kept],
    })
    loadAccountFills.mockResolvedValue([
      {
        ...manualRow,
        confirmedDistinctFillId: '1403850',
        confirmedDistinctFillIds: ['1403850'],
      },
      near,
      exact,
      otherExact,
    ])
    const placed = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        upstreamFillId: '1402237',
        reason: 'also distinct from the one-lot',
        dryRun: false,
      },
      { findManualFill, loadAccountFills, markDistinct },
    )
    expect(placed.ok).toBe(true)
    if (!placed.ok) return
    expect(placed.confirmedDistinctFillIds).toEqual(['1402237', '1403850'])
    expect(markDistinct.mock.calls[0][0].confirmedDistinctFillIds).toEqual([
      '1402237',
      '1403850',
    ])
    const placedAudit = markDistinct.mock.calls[0][0].confirmedDistinctAudit as Array<
      Record<string, unknown>
    >
    expect(placedAudit[0]).toEqual(kept)
    expect(placedAudit).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          op: 'legacy',
          fillId: '1403850',
          relation: 'exact',
          at: '2026-11-16T12:00:00.000Z',
          by: 'prior-admin',
          reason: 'original exact confirm',
        }),
      ]),
    )

    findManualFill.mockResolvedValue({
      ...manualRow,
      confirmedDistinctFillId: '1403850',
      confirmedDistinctFillIds: ['1402237', '1403850'],
      confirmedDistinctAt: new Date('2026-11-16T12:00:00Z'),
      confirmedDistinctAudit: [
        {
          op: 'add',
          fillId: '1402237',
          relation: 'near-miss',
          at: '2026-11-16T12:00:00.000Z',
          by: 'admin',
          reason: 'qty',
        },
        {
          op: 'add',
          fillId: '1403850',
          relation: 'exact',
          at: '2026-11-16T12:01:00.000Z',
          by: 'admin',
          reason: 'exact',
        },
      ],
    })
    markDistinct.mockClear()
    const secondExact = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        upstreamFillId: '88421',
        reason: 'another exact match',
        dryRun: false,
        acknowledgeExactMatch: true,
      },
      { findManualFill, loadAccountFills, markDistinct },
    )
    expect(secondExact.ok).toBe(false)
    if (secondExact.ok) return
    expect(secondExact.status).toBe('bad_request')
    expect(secondExact.errors[0]?.message).toMatch(/only one exact-match/)
    expect(markDistinct).not.toHaveBeenCalled()
  })

  it('refuses a conflicted row unless the conflict is acknowledged or the scalar is removed', async () => {
    const conflicted = {
      ...manualRow,
      confirmedDistinctFillId: '1403850',
      confirmedDistinctFillIds: ['1403850', '1402237'],
      confirmedDistinctAt: new Date('2026-11-16T12:00:00Z'),
      confirmedDistinctAudit: [{ op: 'note', raw: true }],
    }
    const stray = {
      ...manualRow,
      confirmedDistinctFillId: '9999',
      confirmedDistinctFillIds: ['1403850'],
      confirmedDistinctAt: new Date('2026-11-16T12:00:00Z'),
    }
    findManualFill.mockResolvedValue(conflicted)
    loadAccountFills.mockResolvedValue([
      conflicted,
      { ...manualRow, fillId: '88422', source: 'history', fillSize: 1 },
    ])
    const refused = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        upstreamFillId: '88422',
        reason: 'another near-miss',
        dryRun: false,
      },
      { findManualFill, loadAccountFills, markDistinct },
    )
    expect(refused.ok).toBe(false)
    if (refused.ok) return
    expect(refused.status).toBe('acknowledgement_required')
    expect(refused.errors[0]?.field).toBe('acknowledgeMarkerConflict')
    expect(markDistinct).not.toHaveBeenCalled()

    const acknowledged = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        upstreamFillId: '88422',
        reason: 'keep the list and record the scalar',
        dryRun: false,
        acknowledgeMarkerConflict: true,
      },
      { findManualFill, loadAccountFills, markDistinct },
    )
    expect(acknowledged.ok).toBe(true)
    const audit = markDistinct.mock.calls[0][0].confirmedDistinctAudit as Array<Record<string, unknown>>
    expect(audit[0]).toEqual({ op: 'note', raw: true })
    expect(audit).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ op: 'marker-conflict', scalar: '1403850' }),
      ]),
    )

    findManualFill.mockResolvedValue(stray)
    loadAccountFills.mockResolvedValue([stray])
    markDistinct.mockClear()
    const dropped = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        removeUpstreamFillId: '9999',
        reason: 'drop the scalar prod wrote',
        dryRun: false,
      },
      { findManualFill, loadAccountFills, markDistinct },
    )
    expect(dropped.ok).toBe(true)
    if (!dropped.ok) return
    expect(dropped.confirmedDistinctFillIds).toEqual(['1403850'])
    expect(markDistinct.mock.calls[0][0].confirmedDistinctAudit).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          op: 'legacy',
          fillId: '9999',
          scalar: '9999',
          at: '2026-11-16T12:00:00.000Z',
          by: 'unknown',
          reason: 'unknown',
          relation: 'unknown',
        }),
        expect.objectContaining({ op: 'marker-conflict', scalar: '9999' }),
      ]),
    )
  })

  it('keeps a legacy exact twin last when a near-miss is added', async () => {
    const exact = { ...manualRow, fillId: '1403850', source: 'history' }
    const near = {
      ...manualRow,
      fillId: '1402237',
      source: 'history',
      fillSize: 1,
      fillPrice: 5811,
    }
    const row = {
      ...manualRow,
      confirmedDistinctFillId: '1403850',
      confirmedDistinctFillIds: ['1403850'],
      confirmedDistinctAt: new Date('2026-09-01T00:00:00.000Z'),
      confirmedDistinctBy: 'alice',
      confirmDistinctReason: 'backfill exact',
      confirmedDistinctAudit: [],
    }
    findManualFill.mockResolvedValue(row)
    loadAccountFills.mockResolvedValue([row, exact, near])
    const added = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        upstreamFillId: '1402237',
        reason: 'the one-lot is a different execution',
        dryRun: false,
        confirmedDistinctBy: 'beta-admin',
      },
      { findManualFill, loadAccountFills, markDistinct },
    )
    expect(added.ok).toBe(true)
    if (!added.ok) return
    expect(added.confirmedDistinctFillIds).toEqual(['1402237', '1403850'])
    const written = markDistinct.mock.calls[0][0]
    expect(written.confirmedDistinctFillIds).toEqual(['1402237', '1403850'])
    expect(written.confirmedDistinctFillIds.at(-1)).toBe('1403850')
    const audit = written.confirmedDistinctAudit as Array<Record<string, unknown>>
    expect(audit[0]).toEqual({
      op: 'legacy',
      fillId: '1403850',
      at: '2026-09-01T00:00:00.000Z',
      by: 'alice',
      reason: 'backfill exact',
      relation: 'exact',
      scalar: '1403850',
    })
    expect(audit[1]).toEqual(
      expect.objectContaining({ op: 'add', fillId: '1402237', relation: 'near-miss' }),
    )
    expect(audit[0]?.by).not.toBe('beta-admin')
  })

  it('keeps a legacy exact twin last when a later id is removed', async () => {
    const exact = { ...manualRow, fillId: '1403850', source: 'history' }
    const near1 = {
      ...manualRow,
      fillId: '1402237',
      source: 'history',
      fillSize: 1,
      fillPrice: 5811,
    }
    const near2 = {
      ...manualRow,
      fillId: '1402238',
      source: 'history',
      fillPrice: 5812,
    }
    const prior = {
      op: 'add',
      fillId: '1402237',
      relation: 'near-miss',
      at: '2026-09-01T00:00:00.000Z',
      by: 'alice',
      reason: 'qty',
    }
    const row = {
      ...manualRow,
      confirmedDistinctFillId: '1402238',
      confirmedDistinctFillIds: ['1403850', '1402237', '1402238'],
      confirmedDistinctAt: new Date('2026-09-01T00:00:00.000Z'),
      confirmedDistinctBy: 'alice',
      confirmDistinctReason: 'backfill exact',
      confirmedDistinctAudit: [prior],
    }
    findManualFill.mockResolvedValue(row)
    loadAccountFills.mockResolvedValue([row, exact, near1, near2])
    const removed = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        removeUpstreamFillId: '1402238',
        reason: 'that near-miss was the same execution',
        dryRun: false,
      },
      { findManualFill, loadAccountFills, markDistinct },
    )
    expect(removed.ok).toBe(true)
    if (!removed.ok) return
    expect(removed.confirmedDistinctFillIds).toEqual(['1402237', '1403850'])
    const written = markDistinct.mock.calls[0][0]
    expect(written.confirmedDistinctFillIds).toEqual(['1402237', '1403850'])
    expect(written.confirmedDistinctFillIds.at(-1)).toBe('1403850')
    const audit = written.confirmedDistinctAudit as Array<Record<string, unknown>>
    expect(audit[0]).toEqual(prior)
    expect(audit.at(-1)).toEqual(
      expect.objectContaining({ op: 'remove', fillId: '1402238' }),
    )
    expect(audit).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          op: 'legacy',
          fillId: '1403850',
          relation: 'exact',
          at: '2026-09-01T00:00:00.000Z',
          by: 'alice',
          reason: 'backfill exact',
        }),
      ]),
    )
  })

  it('refuses a second exact twin when one is only visible in the book', async () => {
    const exact = { ...manualRow, fillId: '1403850', source: 'history' }
    const otherExact = {
      ...manualRow,
      fillId: '88421',
      source: 'history',
      ssboe: manualRow.ssboe + 10,
    }
    const row = {
      ...manualRow,
      confirmedDistinctFillId: '1403850',
      confirmedDistinctFillIds: ['1403850'],
      confirmedDistinctAt: new Date('2026-09-01T00:00:00.000Z'),
      confirmedDistinctAudit: [],
    }
    findManualFill.mockResolvedValue(row)
    loadAccountFills.mockResolvedValue([row, exact, otherExact])
    const refused = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        upstreamFillId: '88421',
        reason: 'another exact match',
        dryRun: false,
        acknowledgeExactMatch: true,
      },
      { findManualFill, loadAccountFills, markDistinct },
    )
    expect(refused.ok).toBe(false)
    if (refused.ok) return
    expect(refused.status).toBe('bad_request')
    expect(refused.errors[0]?.message).toMatch(/1403850/)
    expect(refused.errors[0]?.message).toMatch(/88421/)
    expect(markDistinct).not.toHaveBeenCalled()
  })

  it('refuses to acknowledge a marker conflict that adds no plant id', async () => {
    const row = {
      ...manualRow,
      confirmedDistinctFillId: '1403850',
      confirmedDistinctFillIds: ['1403850', '1402237'],
      confirmedDistinctAt: new Date('2026-11-16T12:00:00Z'),
      confirmedDistinctAudit: [],
    }
    findManualFill.mockResolvedValue(row)
    loadAccountFills.mockResolvedValue([
      row,
      { ...manualRow, fillId: '1403850', source: 'history' },
      { ...manualRow, fillId: '1402237', source: 'history', fillSize: 1 },
    ])
    const refused = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        upstreamFillId: '1402237',
        reason: 'already on the row',
        dryRun: false,
        acknowledgeMarkerConflict: true,
      },
      { findManualFill, loadAccountFills, markDistinct },
    )
    expect(refused.ok).toBe(false)
    if (refused.ok) return
    expect(refused.status).toBe('acknowledgement_required')
    expect(refused.errors[0]?.field).toBe('markerConflictUnchanged')
    expect(refused.errors[0]?.message).toMatch(/adds no plant ids/)
    expect(refused.errors[0]?.message).toMatch(/conflict stays/)
    expect(markDistinct).not.toHaveBeenCalled()
  })

  it('warns on preview when the scalar is not the last id', async () => {
    const row = {
      ...manualRow,
      confirmedDistinctFillId: '1403850',
      confirmedDistinctFillIds: ['1403850', '1402237'],
      confirmedDistinctAt: new Date('2026-11-16T12:00:00Z'),
    }
    findManualFill.mockResolvedValue(row)
    loadAccountFills.mockResolvedValue([
      row,
      { ...manualRow, fillId: '1403850', source: 'history' },
      { ...manualRow, fillId: '1402237', source: 'history', fillSize: 1, fillPrice: 5811 },
      { ...manualRow, fillId: '88422', source: 'history', fillSize: 1, fillPrice: 5812 },
    ])
    const preview = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        upstreamFillId: '88422',
        reason: 'another one-lot',
      },
      { findManualFill, loadAccountFills, markDistinct },
    )
    expect(preview.ok).toBe(true)
    if (!preview.ok) return
    expect(preview.dryRun).toBe(true)
    expect(preview.warnings?.[0]).toMatch(/1403850/)
    expect(preview.warnings?.[0]).toMatch(/exact/)
    expect(markDistinct).not.toHaveBeenCalled()

    findManualFill.mockResolvedValue({
      ...row,
      confirmedDistinctFillId: null,
    })
    const unset = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        upstreamFillId: '88422',
        reason: 'another one-lot',
      },
      { findManualFill, loadAccountFills, markDistinct },
    )
    expect(unset.ok).toBe(true)
    if (!unset.ok) return
    expect(unset.warnings?.[0]).toMatch(/unset/)
    expect(unset.warnings?.[0]).not.toMatch(/\(null\)/)
  })

  it('requires acknowledgeExactMatch before dropping an exact scalar outside the list', async () => {
    const exact = { ...manualRow, fillId: '1403850', source: 'history' }
    const near = { ...manualRow, fillId: '1402237', source: 'history', fillSize: 1, fillPrice: 5811 }
    const added = { ...manualRow, fillId: '88422', source: 'history', fillSize: 1, fillPrice: 5812 }
    const row = {
      ...manualRow,
      confirmedDistinctFillId: '1403850',
      confirmedDistinctFillIds: ['1402237'],
      confirmedDistinctAt: new Date('2026-11-16T12:00:00Z'),
    }
    findManualFill.mockResolvedValue(row)
    loadAccountFills.mockResolvedValue([row, exact, near, added])
    const refused = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        upstreamFillId: '88422',
        reason: 'another one-lot',
        dryRun: false,
      },
      { findManualFill, loadAccountFills, markDistinct },
    )
    expect(refused.ok).toBe(false)
    if (refused.ok) return
    expect(refused.errors[0]?.field).toBe('acknowledgeMarkerConflict')
    expect(refused.errors[0]?.message).toMatch(/exact/)
    expect(markDistinct).not.toHaveBeenCalled()

    const needsExact = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        upstreamFillId: '88422',
        reason: 'another one-lot',
        dryRun: false,
        acknowledgeMarkerConflict: true,
      },
      { findManualFill, loadAccountFills, markDistinct },
    )
    expect(needsExact.ok).toBe(false)
    if (needsExact.ok) return
    expect(needsExact.status).toBe('acknowledgement_required')
    expect(needsExact.errors[0]?.field).toBe('acknowledgeExactMatch')
    expect(needsExact.errors[0]?.message).toMatch(/1403850/)
    expect(markDistinct).not.toHaveBeenCalled()

    const applied = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        upstreamFillId: '88422',
        reason: 'another one-lot',
        dryRun: false,
        acknowledgeMarkerConflict: true,
        acknowledgeExactMatch: true,
      },
      { findManualFill, loadAccountFills, markDistinct },
    )
    expect(applied.ok).toBe(true)
    if (!applied.ok) return
    expect(applied.confirmedDistinctFillIds.at(-1)).not.toBe('1403850')
    expect(markDistinct).toHaveBeenCalledTimes(1)

    findManualFill.mockResolvedValue(row)
    markDistinct.mockClear()
    const removed = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        removeUpstreamFillId: '1403850',
        reason: 'drop the exact scalar',
        dryRun: false,
      },
      { findManualFill, loadAccountFills, markDistinct },
    )
    expect(removed.ok).toBe(false)
    if (removed.ok) return
    expect(removed.errors[0]?.field).toBe('acknowledgeExactMatch')
    expect(markDistinct).not.toHaveBeenCalled()
  })
})

describe('confirm-distinct where clause', () => {
  const findFirst = prisma.rithmicProtocolFill.findFirst as ReturnType<typeof vi.fn>
  const findManyFills = prisma.rithmicProtocolFill.findMany as ReturnType<typeof vi.fn>
  const updateMany = prisma.rithmicProtocolFill.updateMany as ReturnType<typeof vi.fn>

  beforeEach(() => {
    findFirst.mockReset()
    findManyFills.mockReset().mockResolvedValue([])
    updateMany.mockReset().mockResolvedValue({ count: 1 })
  })

  it('scopes the lookup and the write to this user and account, and will not mark another source', async () => {
    findFirst.mockResolvedValue(null)
    const otherUser = await confirmDistinctManualRithmicProtocolFill({
      userId: 'user-a',
      accountNumber: 'ACCT-A',
      fillId: 'manual-belongs-to-user-b',
      upstreamFillId: '88422',
      reason: 'not this user',
      dryRun: false,
    })
    expect(otherUser.ok).toBe(false)
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        userId: 'user-a',
        accountNumber: 'ACCT-A',
        fillId: 'manual-belongs-to-user-b',
      },
      select: expect.objectContaining({
        fillId: true,
        source: true,
        symbol: true,
        transactionType: true,
        confirmedDistinctFillId: true,
        confirmedDistinctFillIds: true,
      }),
    })
    expect(updateMany).not.toHaveBeenCalled()

    findFirst.mockResolvedValue({ fillId: 'manual-plant', source: 'history' })
    const plant = await confirmDistinctManualRithmicProtocolFill({
      userId: 'user-a',
      accountNumber: 'ACCT-A',
      fillId: 'manual-plant',
      upstreamFillId: '88422',
      reason: 'plant row',
      dryRun: false,
    })
    expect(plant.ok).toBe(false)
    if (plant.ok) return
    expect(plant.status).toBe('validation')
    expect(updateMany).not.toHaveBeenCalled()

    const manualRow = {
      fillId: 'manual-gap',
      source: 'manual',
      accountNumber: 'ACCT-B',
      symbol: 'MESZ6',
      transactionType: 'BUY',
      fillPrice: 5810.25,
      fillSize: 2,
      fillDate: '20260925',
      fillTime: '15:07:00',
      ssboe: 1_758_810_420,
      confirmedDistinctFillId: null,
      confirmedDistinctAt: null,
      confirmedDistinctBy: null,
      confirmDistinctReason: null,
    }
    findFirst.mockImplementation(async (args: { where?: { fillId?: string } }) => {
      if (args?.where?.fillId === 'manual-gap') return manualRow
      return null
    })
    const plantRow = { ...manualRow, fillId: '88422', source: 'history', fillSize: 1 }
    findManyFills.mockImplementation(async (args: { where?: { userId?: string } }) => {
      expect(args.where).toEqual({ userId: 'user-b', accountNumber: 'ACCT-B' })
      return [manualRow, plantRow]
    })
    const applied = await confirmDistinctManualRithmicProtocolFill({
      userId: 'user-b',
      accountNumber: 'ACCT-B',
      fillId: 'manual-gap',
      upstreamFillId: '88422',
      reason: 'this account only',
      dryRun: false,
    })
    expect(applied.ok).toBe(true)
    if (!applied.ok) return
    expect(applied.relation).toEqual({ kind: 'near-miss', reason: 'qty', orderFillId: '88422' })
    expect(findManyFills).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-b', accountNumber: 'ACCT-B' },
      }),
    )
    expect(prisma.trade.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user-b',
          accountNumber: 'ACCT-B',
          instrument: 'MES',
          tags: { has: RITHMIC_PROTOCOL_TRADE_TAG },
        },
      }),
    )
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-b',
        accountNumber: 'ACCT-B',
        fillId: 'manual-gap',
        source: 'manual',
        confirmedDistinctFillId: null,
        confirmedDistinctFillIds: { equals: [] },
        confirmedDistinctAudit: { equals: [] },
      },
      data: expect.objectContaining({
        confirmedDistinctFillIds: ['88422'],
        confirmedDistinctFillId: '88422',
        confirmedDistinctBy: 'admin',
        confirmDistinctReason: 'this account only',
        confirmedDistinctAudit: [
          expect.objectContaining({ op: 'add', fillId: '88422', by: 'admin' }),
        ],
      }),
    })
  })

  it('returns a conflict when the marker changed after it was read', async () => {
    const manualRow = {
      fillId: 'manual-gap',
      source: 'manual',
      accountNumber: 'ACCT-B',
      symbol: 'MESZ6',
      transactionType: 'BUY',
      fillPrice: 5810.25,
      fillSize: 2,
      fillDate: '20260925',
      fillTime: '15:07:00',
      ssboe: 1_758_810_420,
      confirmedDistinctFillId: '1403850',
      confirmedDistinctFillIds: ['1403850'],
      confirmedDistinctAt: new Date('2026-11-16T12:00:00Z'),
      confirmedDistinctBy: 'admin',
      confirmDistinctReason: 'first plant fill',
      confirmedDistinctAudit: [],
    }
    findFirst.mockImplementation(async (args: { where?: { fillId?: string } }) => {
      if (args?.where?.fillId === 'manual-gap') return manualRow
      return null
    })
    findManyFills.mockResolvedValue([
      manualRow,
      { ...manualRow, fillId: '1402237', source: 'history', fillSize: 1 },
    ])
    updateMany.mockResolvedValue({ count: 0 })
    const raced = await confirmDistinctManualRithmicProtocolFill({
      userId: 'user-b',
      accountNumber: 'ACCT-B',
      fillId: 'manual-gap',
      upstreamFillId: '1402237',
      reason: 'second plant fill',
      dryRun: false,
    })
    expect(raced.ok).toBe(false)
    if (raced.ok) return
    expect(raced.status).toBe('conflict')
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-b',
        accountNumber: 'ACCT-B',
        fillId: 'manual-gap',
        source: 'manual',
        confirmedDistinctFillId: '1403850',
        confirmedDistinctFillIds: { equals: ['1403850'] },
        confirmedDistinctAudit: { equals: [] },
      },
      data: expect.objectContaining({
        confirmedDistinctFillIds: ['1403850', '1402237'],
        confirmedDistinctFillId: '1402237',
      }),
    })
  })

  it('writes the legacy exact twin as the scalar when a near-miss is added', async () => {
    const manualRow = {
      fillId: 'manual-gap',
      source: 'manual',
      accountNumber: 'ACCT-B',
      symbol: 'MESZ6',
      transactionType: 'BUY',
      fillPrice: 5810.25,
      fillSize: 2,
      fillDate: '20260925',
      fillTime: '15:07:00',
      ssboe: 1_758_810_420,
      confirmedDistinctFillId: '1403850',
      confirmedDistinctFillIds: ['1403850'],
      confirmedDistinctAt: new Date('2026-09-01T00:00:00.000Z'),
      confirmedDistinctBy: 'alice',
      confirmDistinctReason: 'backfill exact',
      confirmedDistinctAudit: [],
    }
    const exact = { ...manualRow, fillId: '1403850', source: 'history' }
    const near = { ...manualRow, fillId: '1402237', source: 'history', fillSize: 1, fillPrice: 5811 }
    findFirst.mockImplementation(async (args: { where?: { fillId?: string } }) => {
      if (args?.where?.fillId === 'manual-gap') return manualRow
      return null
    })
    findManyFills.mockResolvedValue([manualRow, exact, near])
    const added = await confirmDistinctManualRithmicProtocolFill({
      userId: 'user-b',
      accountNumber: 'ACCT-B',
      fillId: 'manual-gap',
      upstreamFillId: '1402237',
      reason: 'the one-lot is different',
      dryRun: false,
    })
    expect(added.ok).toBe(true)
    expect(updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        userId: 'user-b',
        accountNumber: 'ACCT-B',
        fillId: 'manual-gap',
        source: 'manual',
        confirmedDistinctFillId: '1403850',
        confirmedDistinctFillIds: { equals: ['1403850'] },
      }),
      data: expect.objectContaining({
        confirmedDistinctFillIds: ['1402237', '1403850'],
        confirmedDistinctFillId: '1403850',
      }),
    })
  })

  it('returns a conflict when a remove loses the compare-and-swap', async () => {
    const manualRow = {
      fillId: 'manual-gap',
      source: 'manual',
      accountNumber: 'ACCT-B',
      symbol: 'MESZ6',
      transactionType: 'BUY',
      fillPrice: 5810.25,
      fillSize: 2,
      fillDate: '20260925',
      fillTime: '15:07:00',
      ssboe: 1_758_810_420,
      confirmedDistinctFillId: '1402237',
      confirmedDistinctFillIds: ['1403850', '1402237'],
      confirmedDistinctAt: new Date('2026-11-16T12:00:00Z'),
      confirmedDistinctBy: 'admin',
      confirmDistinctReason: 'first plant fill',
      confirmedDistinctAudit: [
        {
          op: 'add',
          fillId: '1403850',
          relation: 'near-miss',
          at: '2026-11-16T12:00:00.000Z',
          by: 'admin',
          reason: 'qty',
        },
      ],
    }
    findFirst.mockImplementation(async (args: { where?: { fillId?: string } }) => {
      if (args?.where?.fillId === 'manual-gap') return manualRow
      return null
    })
    findManyFills.mockResolvedValue([
      manualRow,
      { ...manualRow, fillId: '1403850', source: 'history', fillSize: 1 },
      { ...manualRow, fillId: '1402237', source: 'history', fillSize: 1, fillPrice: 5811 },
    ])
    updateMany.mockResolvedValue({ count: 0 })
    const raced = await confirmDistinctManualRithmicProtocolFill({
      userId: 'user-b',
      accountNumber: 'ACCT-B',
      fillId: 'manual-gap',
      removeUpstreamFillId: '1403850',
      reason: 'drop the first id',
      dryRun: false,
    })
    expect(raced.ok).toBe(false)
    if (raced.ok) return
    expect(raced.status).toBe('conflict')
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-b',
          accountNumber: 'ACCT-B',
          fillId: 'manual-gap',
          source: 'manual',
          confirmedDistinctFillId: '1402237',
          confirmedDistinctFillIds: { equals: ['1403850', '1402237'] },
          confirmedDistinctAudit: { equals: manualRow.confirmedDistinctAudit },
        }),
      }),
    )
  })
})

describe('retire where clause', () => {
  const findFirst = prisma.rithmicProtocolFill.findFirst as ReturnType<typeof vi.fn>
  const updateMany = prisma.rithmicProtocolFill.updateMany as ReturnType<typeof vi.fn>
  const findTrades = prisma.trade.findMany as ReturnType<typeof vi.fn>

  beforeEach(() => {
    findFirst.mockReset()
    updateMany.mockReset().mockResolvedValue({ count: 1 })
    findTrades.mockReset().mockResolvedValue([])
  })

  it('scopes the lookup and the write to this user and account, and will not retire another source', async () => {
    findFirst.mockResolvedValue(null)
    const otherUser = await retireManualRithmicProtocolFill({
      userId: 'user-a',
      accountNumber: 'ACCT-A',
      fillId: 'manual-belongs-to-user-b',
      reason: 'not this user',
      dryRun: false,
    })
    expect(otherUser.ok).toBe(false)
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        userId: 'user-a',
        accountNumber: 'ACCT-A',
        fillId: 'manual-belongs-to-user-b',
      },
      select: {
        fillId: true,
        source: true,
        retiredAt: true,
        retiredBy: true,
        retireReason: true,
      },
    })
    expect(updateMany).not.toHaveBeenCalled()

    findFirst.mockResolvedValue(null)
    const otherAccount = await retireManualRithmicProtocolFill({
      userId: 'user-a',
      accountNumber: 'ACCT-B',
      fillId: 'manual-belongs-to-user-b',
      reason: 'not this account',
      dryRun: false,
    })
    expect(otherAccount.ok).toBe(false)
    expect(findFirst).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user-a',
          accountNumber: 'ACCT-B',
          fillId: 'manual-belongs-to-user-b',
        },
      }),
    )
    expect(updateMany).not.toHaveBeenCalled()

    findFirst.mockResolvedValue({ fillId: 'manual-plant', source: 'history' })
    const plant = await retireManualRithmicProtocolFill({
      userId: 'user-a',
      accountNumber: 'ACCT-A',
      fillId: 'manual-plant',
      reason: 'plant row',
      dryRun: false,
    })
    expect(plant.ok).toBe(false)
    if (plant.ok) return
    expect(plant.status).toBe('validation')
    expect(updateMany).not.toHaveBeenCalled()
    expect(findTrades).not.toHaveBeenCalled()

    findFirst.mockResolvedValue({ fillId: 'manual-gap', source: 'manual' })
    const applied = await retireManualRithmicProtocolFill({
      userId: 'user-b',
      accountNumber: 'ACCT-B',
      fillId: 'manual-gap',
      reason: 'this account only',
      dryRun: false,
    })
    expect(applied.ok).toBe(true)
    expect(findTrades).toHaveBeenCalledWith({
      where: {
        userId: 'user-b',
        accountNumber: 'ACCT-B',
        tags: { has: RITHMIC_PROTOCOL_TRADE_TAG },
        OR: [{ entryId: 'manual-gap' }, { closeId: 'manual-gap' }],
      },
      select: expect.objectContaining({ id: true, entryId: true, closeId: true }),
    })
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-b',
        accountNumber: 'ACCT-B',
        fillId: 'manual-gap',
        source: 'manual',
      },
      data: expect.objectContaining({
        source: 'manual-retired',
        retiredBy: 'admin',
        retireReason: 'this account only',
      }),
    })
  })
})

describe('parseManualFillCliArgs', () => {
  const argv = [
    '--user-id',
    base.userId,
    '--account',
    base.accountNumber,
    '--symbol',
    base.symbol,
    '--exchange',
    base.exchange,
    '--side',
    'buy',
    '--qty',
    '2',
    '--price',
    '5810.25',
    '--timestamp',
    base.timestamp,
    '--note',
    base.note,
  ]

  it('previews unless --apply is set', () => {
    const preview = parseManualFillCliArgs([...argv, '--dry-run'])
    expect(preview.ok).toBe(true)
    if (!preview.ok) return
    expect(preview.input.dryRun).toBe(true)
    const implied = parseManualFillCliArgs(argv)
    expect(implied.ok).toBe(true)
    if (!implied.ok) return
    expect(implied.input.dryRun).toBe(true)
    const apply = parseManualFillCliArgs([...argv, '--apply'])
    expect(apply.ok).toBe(true)
    if (!apply.ok) return
    expect(apply.input.dryRun).toBe(false)
  })

  it('retire previews unless --apply, and acknowledge-warnings is explicit', () => {
    const preview = parseManualFillCliArgs([
      '--retire',
      '--user-id',
      base.userId,
      '--account',
      base.accountNumber,
      '--fill-id',
      'manual-gap',
      '--reason',
      'plant fill arrived',
    ])
    expect(preview.ok).toBe(true)
    if (!preview.ok) return
    expect(preview.command).toBe('retire')
    expect(preview.input.dryRun).toBe(true)
    expect(preview.input.fillId).toBe('manual-gap')
    const apply = parseManualFillCliArgs([
      '--retire',
      '--user-id',
      base.userId,
      '--account',
      base.accountNumber,
      '--fill-id',
      'manual-gap',
      '--reason',
      'plant fill arrived',
      '--apply',
    ])
    expect(apply.ok).toBe(true)
    if (!apply.ok) return
    expect(apply.input.dryRun).toBe(false)
    const acknowledged = parseManualFillCliArgs([
      ...argv,
      '--apply',
      '--acknowledge-warnings',
    ])
    expect(acknowledged.ok).toBe(true)
    if (!acknowledged.ok) return
    expect(acknowledged.command).toBe('insert')
    expect(acknowledged.input.dryRun).toBe(false)
    expect(acknowledged.input.acknowledgeWarnings).toBe(true)
    const annotated = parseManualFillCliArgs([
      '--retire',
      '--user-id',
      base.userId,
      '--account',
      base.accountNumber,
      '--fill-id',
      'manual-gap',
      '--reason',
      'plant fill arrived',
      '--apply',
      '--acknowledge-annotated-trades',
    ])
    expect(annotated.ok).toBe(true)
    if (!annotated.ok) return
    expect(annotated.command).toBe('retire')
    expect(annotated.input.dryRun).toBe(false)
    expect(annotated.input.acknowledgeAnnotatedTrades).toBe(true)
  })

  it('rejects --dry-run together with --apply and a non-integer qty', () => {
    const both = parseManualFillCliArgs([...argv, '--dry-run', '--apply'])
    expect(both.ok).toBe(false)
    const qty = parseManualFillCliArgs(argv.map((arg) => (arg === '2' ? '2.5' : arg)))
    expect(qty.ok).toBe(false)
  })
})

describe('insertManualRithmicProtocolFill', () => {
  const findAccount = vi.fn()
  const loadFills = vi.fn()
  const upsertFills = vi.fn()

  beforeEach(() => {
    findAccount.mockReset().mockResolvedValue({ id: 'acct-1' })
    loadFills.mockReset().mockResolvedValue([])
    upsertFills.mockReset().mockResolvedValue({ inserted: 1, updated: 0, skipped: 0 })
  })

  it('warns on preview when a stored upstream fill would supersede the manual', async () => {
    const preview = await insertManualRithmicProtocolFill(base, {
      findAccount,
      loadFills,
      upsertFills,
    })
    if (!preview.ok) throw new Error('preview failed')
    loadFills.mockResolvedValue([
      { ...preview.fill, source: 'history', fillId: '88421' },
    ])
    const warned = await insertManualRithmicProtocolFill(base, {
      findAccount,
      loadFills,
      upsertFills,
    })
    expect(warned.ok).toBe(true)
    if (!warned.ok) return
    expect(warned.dryRun).toBe(true)
    expect(warned.warnings[0]).toMatch(/upstream fill matches/)
    expect(upsertFills).not.toHaveBeenCalled()
  })

  it('warns on preview when a stored fill is a near miss', async () => {
    const preview = await insertManualRithmicProtocolFill(base, {
      findAccount,
      loadFills,
      upsertFills,
    })
    if (!preview.ok) throw new Error('preview failed')
    loadFills.mockResolvedValue([
      {
        ...preview.fill,
        source: 'history',
        fillId: '88421',
        ssboe: (preview.fill.ssboe ?? 0) + 45,
      },
    ])
    const warned = await insertManualRithmicProtocolFill(base, {
      findAccount,
      loadFills,
      upsertFills,
    })
    expect(warned.ok).toBe(true)
    if (!warned.ok) return
    expect(warned.warnings.some((warning) => warning.includes('Near-miss'))).toBe(true)
    expect(
      warned.warnings.some((warning) =>
        warning.includes('will not be derived while this near-miss stands'),
      ),
    ).toBe(true)
    expect(warned.warnings.some((warning) => warning.includes('until the patch matches exactly'))).toBe(
      false,
    )
    expect(upsertFills).not.toHaveBeenCalled()
  })

  it('refuses apply when a warning is present unless it is acknowledged', async () => {
    const preview = await insertManualRithmicProtocolFill(base, {
      findAccount,
      loadFills,
      upsertFills,
    })
    if (!preview.ok) throw new Error('preview failed')
    loadFills.mockResolvedValue([
      { ...preview.fill, source: 'history', fillId: '88421', ssboe: (preview.fill.ssboe ?? 0) + 45 },
    ])
    const refused = await insertManualRithmicProtocolFill(
      { ...base, dryRun: false },
      { findAccount, loadFills, upsertFills },
    )
    expect(refused.ok).toBe(false)
    if (refused.ok) return
    expect(refused.status).toBe('acknowledgement_required')
    expect(upsertFills).not.toHaveBeenCalled()
    loadFills.mockResolvedValue([
      { ...preview.fill, source: 'history', fillId: '88421' },
    ])
    const superseded = await insertManualRithmicProtocolFill(
      { ...base, dryRun: false },
      { findAccount, loadFills, upsertFills },
    )
    expect(superseded.ok).toBe(false)
    if (superseded.ok) return
    expect(superseded.status).toBe('acknowledgement_required')
    expect(superseded.warnings?.[0]).toMatch(/upstream fill matches/)
    expect(upsertFills).not.toHaveBeenCalled()
    const applied = await insertManualRithmicProtocolFill(
      { ...base, dryRun: false, acknowledgeWarnings: true },
      { findAccount, loadFills, upsertFills },
    )
    expect(applied.ok).toBe(true)
    expect(upsertFills).toHaveBeenCalledTimes(1)
  })

  it('dry-run builds one manual- fill and does not write', async () => {
    const result = await insertManualRithmicProtocolFill(base, {
      findAccount,
      loadFills,
      upsertFills,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.dryRun).toBe(true)
    expect(result.idempotent).toBe(false)
    expect(result.fillId.startsWith('manual-')).toBe(true)
    expect(result.fill.source).toBe('manual')
    expect(result.fill.fillSize).toBe(2)
    expect(result.fill.transactionType).toBe('BUY')
    expect(result.note).toBe(base.note)
    expect(upsertFills).not.toHaveBeenCalled()
  })

  it('writes once and treats the same patch as already present', async () => {
    const stored: RithmicProtocolFill[] = []
    loadFills.mockImplementation(async () => stored)
    upsertFills.mockImplementation(async (params: { fills: RithmicProtocolFill[] }) => {
      stored.push(...params.fills)
      return { inserted: params.fills.length, updated: 0, skipped: 0 }
    })
    const first = await insertManualRithmicProtocolFill(
      { ...base, dryRun: false },
      { findAccount, loadFills, upsertFills },
    )
    const second = await insertManualRithmicProtocolFill(
      { ...base, note: 'same fill, confirmed again', dryRun: false },
      { findAccount, loadFills, upsertFills },
    )
    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)
    if (!first.ok || !second.ok) return
    expect(first.idempotent).toBe(false)
    expect(second.idempotent).toBe(true)
    expect(second.fillId).toBe(first.fillId)
    expect(upsertFills).toHaveBeenCalledTimes(1)
    expect(stored).toHaveLength(1)
    expect(stored[0]?.source).toBe('manual')
  })

  it('does not write when the account is missing or validation fails', async () => {
    findAccount.mockResolvedValueOnce(null)
    const missing = await insertManualRithmicProtocolFill(
      { ...base, dryRun: false },
      { findAccount, loadFills, upsertFills },
    )
    expect(missing.ok).toBe(false)
    if (missing.ok) return
    expect(missing.status).toBe('account_not_found')
    const invalid = await insertManualRithmicProtocolFill(
      { ...base, qty: -1 },
      { findAccount, loadFills, upsertFills },
    )
    expect(invalid.ok).toBe(false)
    expect(upsertFills).not.toHaveBeenCalled()
    expect(findAccount).toHaveBeenCalledTimes(1)
  })

  it('refuses when the identity is already a plant fill', async () => {
    const preview = await insertManualRithmicProtocolFill(base, {
      findAccount,
      loadFills,
      upsertFills,
    })
    if (!preview.ok) throw new Error('preview failed')
    loadFills.mockResolvedValue([{ ...preview.fill, source: 'history' }])
    const result = await insertManualRithmicProtocolFill(
      { ...base, dryRun: false },
      { findAccount, loadFills, upsertFills },
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe('conflict')
    expect(upsertFills).not.toHaveBeenCalled()
  })
})

describe('retire then ordinary sync', () => {
  const tick = new Map([['MES', { tickSize: 0.25, tickValue: 1.25 }]])

  it('keeps annotated manual trades and reaps unannotated ones, with or without a near-miss plant twin', async () => {
    const ssboe = Date.parse('2026-09-25T15:07:00Z') / 1000
    const manual: RithmicProtocolFill = {
      accountId: base.accountNumber,
      symbol: 'MESZ6',
      transactionType: 'BUY',
      fillPrice: 7800,
      fillSize: 1,
      fillDate: '20260925',
      fillId: 'manual-gap',
      ssboe,
      source: 'manual',
    }
    const close: RithmicProtocolFill = {
      ...manual,
      fillId: '1002',
      transactionType: 'SELL',
      fillPrice: 7801,
      ssboe: ssboe + 60,
      source: 'history',
    }
    const plant: RithmicProtocolFill = {
      ...manual,
      fillId: '88421',
      fillPrice: 7800.5,
      ssboe: ssboe + 4,
      source: 'history',
    }
    const before = buildTradesFromRithmicFills(
      deriveTradesFromFillLedger([manual, close], []).fills,
      'user-1',
      tick,
    ).trades
    expect(before).toHaveLength(1)
    const plain = {
      ...before[0],
      id: 'stored-manual-trade',
      comment: null,
      tags: [RITHMIC_PROTOCOL_TRADE_TAG],
    }
    const noted = { ...plain, comment: 'kept note' }

    async function retireThenSync(annotated: boolean, withTwin: boolean) {
      const row: RithmicProtocolFill = { ...manual, source: 'manual' }
      const markRetired = vi.fn(async () => {
        row.source = 'manual-retired'
      })
      const retired = await retireManualRithmicProtocolFill(
        {
          userId: 'user-1',
          accountNumber: base.accountNumber,
          fillId: 'manual-gap',
          reason: 'wrong price',
          dryRun: false,
          acknowledgeAnnotatedTrades: annotated,
        },
        {
          findManualFill: async () => ({ fillId: 'manual-gap', source: 'manual' }),
          markRetired,
          findDerivedTrades: async () => [
            {
              id: plain.id,
              entryId: 'manual-gap',
              closeId: '1002',
              instrument: 'MES',
              annotated,
            },
          ],
        },
      )
      expect(retired.ok).toBe(true)
      expect(markRetired).toHaveBeenCalledTimes(1)
      const ledger = [row, close]
      const incoming = withTwin ? [plant] : []
      if (withTwin) {
        const blocked = deriveTradesFromFillLedger([manual, close], [plant])
        expect(blocked.nearMisses.some((miss) => miss.reason.includes('price'))).toBe(true)
      }
      const prepared = deriveTradesFromFillLedger(ledger, incoming)
      const derived = buildTradesFromRithmicFills(
        planManualFillSyncEffects(prepared).fifoFills,
        'user-1',
        tick,
      ).trades
      const fills = [...ledger, ...incoming]
      const existing = annotated ? noted : plain
      return {
        derived,
        reaped: phantomProtocolTradeIds({
          existing: [existing],
          derived,
          ledgerFillIds: canonicalLedgerFillIds(fills),
        }),
        kept: countRetiredManualTradesKept({
          existing: [existing],
          derived,
          ledgerFillIds: canonicalLedgerFillIds(fills),
          retiredFillIds: retiredManualFillIds(fills),
        }),
      }
    }

    const annotatedTwin = await retireThenSync(true, true)
    expect(annotatedTwin.reaped).toEqual([])
    expect(annotatedTwin.kept).toBe(1)
    expect(annotatedTwin.derived.map((trade) => trade.entryId)).toEqual(['88421'])

    const annotatedNone = await retireThenSync(true, false)
    expect(annotatedNone.reaped).toEqual([])
    expect(annotatedNone.kept).toBe(1)
    expect(annotatedNone.derived).toEqual([])

    const plainTwin = await retireThenSync(false, true)
    expect(plainTwin.reaped).toEqual(['stored-manual-trade'])
    expect(plainTwin.kept).toBe(0)
    expect(plainTwin.derived.map((trade) => trade.entryId)).toEqual(['88421'])

    const plainNone = await retireThenSync(false, false)
    expect(plainNone.reaped).toEqual(['stored-manual-trade'])
    expect(plainNone.kept).toBe(0)
    expect(plainNone.derived).toEqual([])
  })
})
