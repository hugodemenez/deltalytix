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

  it('gates an annotated trade on the plant fill an overwritten marker frees', async () => {
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
        upstreamFillId: '7700',
        reason: 'point the marker at a different fill',
        dryRun: false,
        acknowledgeUnrelated: true,
      },
      { findManualFill, loadAccountFills, markDistinct, findDerivedTrades },
    )
    expect(refused.ok).toBe(false)
    if (refused.ok) return
    expect(refused.errors[0]?.field).toBe('acknowledgeAnnotatedTrades')
    expect(refused.trades?.map((trade) => trade.id)).toEqual(['stored-freed', 'stored-manual'])
    expect(refused.tradeEffects).toEqual({ displaced: 2, annotated: 1 })
    expect(markDistinct).not.toHaveBeenCalled()
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
    expect(refused.tradeEffects).toEqual({ displaced: 2, annotated: 1 })
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

  it('returns the marker a later confirm-distinct overwrites', async () => {
    findManualFill.mockResolvedValue({
      ...manualRow,
      confirmedDistinctFillId: '7700',
      confirmedDistinctAt: new Date('2026-09-01T00:00:00Z'),
    })
    const applied = await confirmDistinctManualRithmicProtocolFill(
      {
        userId: 'user-1',
        accountNumber: base.accountNumber,
        fillId: 'manual-gap',
        upstreamFillId: '88422',
        reason: 'replace the old marker',
        dryRun: false,
      },
      { findManualFill, loadAccountFills, markDistinct },
    )
    expect(applied.ok).toBe(true)
    if (!applied.ok) return
    expect(applied.previousConfirmedDistinctFillId).toBe('7700')
    expect(applied.idempotent).toBe(false)
    expect(applied.upstreamFillId).toBe('88422')
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
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-b',
        accountNumber: 'ACCT-B',
        fillId: 'manual-gap',
        source: 'manual',
      },
      data: expect.objectContaining({
        confirmedDistinctFillId: '88422',
        confirmedDistinctBy: 'admin',
        confirmDistinctReason: 'this account only',
      }),
    })
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
