import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RithmicProtocolFill } from './types'

vi.mock('@/lib/prisma', () => {
  const client = {
    account: { findFirst: vi.fn() },
    rithmicProtocolFill: { findMany: vi.fn(), createMany: vi.fn(), updateMany: vi.fn() },
    $disconnect: vi.fn(),
  }
  return { prisma: client, prismaBase: client }
})

import {
  insertManualRithmicProtocolFill,
  manualFillId,
  parseManualFillCliArgs,
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
