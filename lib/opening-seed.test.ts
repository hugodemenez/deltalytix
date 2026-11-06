import { describe, expect, it } from 'vitest'
import {
  isOpeningSeedCloseTrade,
  OPENING_SEED_ORDER_ID_PREFIX,
  RITHMIC_PROTOCOL_OPENING_SEED_TAG,
  withoutOpeningSeedCloses,
} from './opening-seed'

describe('opening-seed close helper', () => {
  it('matches the seed prefix or tag and drops those rows from aggregates', () => {
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
    expect(isOpeningSeedCloseTrade(byTag)).toBe(true)
    expect(isOpeningSeedCloseTrade(real)).toBe(false)
    expect(withoutOpeningSeedCloses([byPrefix, byTag, real])).toEqual([real])
  })
})
