import { describe, expect, it } from 'vitest'
import { RITHMIC_PROTOCOL_TRADE_TAG } from '@/lib/trade-id-utils'
import { filterRithmicProtocolTradesCoveredByStoredRows } from './dedupe-fills'
import { phantomProtocolTradeIds } from './fill-ledger'

const ACCOUNT = 'LFE050-I7X0S9B3-TEST001'

/** Overnight leftover: same price/time legs as the replacement, different fill pair. */
const phantomOvernight = {
  id: 'phantom-overnight',
  accountNumber: ACCOUNT,
  instrument: 'MES',
  side: 'Short',
  quantity: 1,
  entryPrice: '7800',
  closePrice: '7804',
  entryDate: '2026-09-30T14:00:00.000+00:00',
  closeDate: '2026-09-30T14:05:00.000+00:00',
  entryId: '999',
  closeId: '888',
  tags: [RITHMIC_PROTOCOL_TRADE_TAG],
}

const replacementSameDay = {
  id: 'replacement-same-day',
  accountNumber: ACCOUNT,
  instrument: 'MES',
  side: 'Short',
  quantity: 1,
  entryPrice: '7800',
  closePrice: '7804',
  entryDate: '2026-09-30T14:00:00.000+00:00',
  closeDate: '2026-09-30T14:05:00.000+00:00',
  entryId: '1002',
  closeId: '1001',
  tags: [RITHMIC_PROTOCOL_TRADE_TAG],
}

describe('H1 save coverage and phantom reap together', () => {
  it('pending-reap phantoms must not skip the replacement trade', () => {
    const covered = filterRithmicProtocolTradesCoveredByStoredRows(
      [replacementSameDay],
      [phantomOvernight],
    )
    expect(covered.skipped).toEqual([replacementSameDay])

    const pendingIds = phantomProtocolTradeIds({
      existing: [phantomOvernight],
      derived: [replacementSameDay],
      ledgerFillIds: new Set(['888', '999', '1001', '1002']),
    })
    expect(pendingIds).toEqual(['phantom-overnight'])

    const coverageRows = [phantomOvernight].filter(
      (row) => !pendingIds.includes(row.id),
    )
    const afterExclude = filterRithmicProtocolTradesCoveredByStoredRows(
      [replacementSameDay],
      coverageRows,
    )
    expect(afterExclude.kept).toEqual([replacementSameDay])
    expect(afterExclude.skipped).toEqual([])
  })
})
