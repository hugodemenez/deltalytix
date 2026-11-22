import { describe, expect, it } from 'vitest'
import { scopeProtocolAccountIds } from './scope-accounts'

const AVAILABLE = ['LFE050-I7X0S9B3-TEST001', 'LFE050-OTHER']

describe('scopeProtocolAccountIds', () => {
  it('returns every stored account when no filter is passed', () => {
    expect(scopeProtocolAccountIds(AVAILABLE)).toEqual({
      accountIds: AVAILABLE,
    })
  })

  it('keeps only the requested account', () => {
    expect(
      scopeProtocolAccountIds(AVAILABLE, ['LFE050-I7X0S9B3-TEST001']),
    ).toEqual({ accountIds: ['LFE050-I7X0S9B3-TEST001'] })
  })

  it('rejects an account that is not on this connection', () => {
    expect(scopeProtocolAccountIds(AVAILABLE, ['SOMEONE-ELSE'])).toEqual({
      error: 'ACCOUNT_NOT_ON_CONNECTION',
    })
  })
})
