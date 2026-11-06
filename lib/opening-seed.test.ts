import { describe, expect, it } from 'vitest'
import {
  analysisNetPnl,
  isOpeningSeedCloseTrade,
  OPENING_SEED_ORDER_ID_PREFIX,
  RITHMIC_PROTOCOL_OPENING_SEED_TAG,
  withoutOpeningSeedCloses,
} from './opening-seed'

describe('opening-seed close helper', () => {
  it('matches the seed prefix only so a user tag cannot hide a real close', () => {
    const byPrefix = {
      entryId: `${OPENING_SEED_ORDER_ID_PREFIX}acct:MESZ6`,
      tags: ['rithmic-protocol'],
    }
    const byTag = {
      entryId: 'cover-1',
      tags: ['rithmic-protocol', RITHMIC_PROTOCOL_OPENING_SEED_TAG],
    }
    const real = { entryId: '1001', tags: ['rithmic-protocol'] }
    expect(isOpeningSeedCloseTrade(byPrefix)).toBe(true)
    expect(isOpeningSeedCloseTrade(byTag)).toBe(false)
    expect(isOpeningSeedCloseTrade(real)).toBe(false)
    expect(withoutOpeningSeedCloses([byPrefix, byTag, real])).toEqual([
      byTag,
      real,
    ])
  })

  it('counts only the exit fee for seed closes and full net for real closes', () => {
    expect(
      analysisNetPnl({
        entryId: `${OPENING_SEED_ORDER_ID_PREFIX}acct:MES`,
        pnl: 999,
        commission: 4.5,
      }),
    ).toBe(-4.5)
    expect(analysisNetPnl({ entryId: '1001', pnl: 80, commission: 2 })).toBe(78)
  })
})
