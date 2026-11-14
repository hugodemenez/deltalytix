import { describe, expect, it } from 'vitest'

import {
  isDeleteAccountBlocked,
  type DeleteAccountResult,
} from './account-deletion-result'

describe('isDeleteAccountBlocked', () => {
  it('detects structured blocked billing results', () => {
    const blocked: DeleteAccountResult = {
      status: 'blocked',
      reason: 'billing_check_failed',
    }
    expect(isDeleteAccountBlocked(blocked)).toBe(true)
    expect(isDeleteAccountBlocked({ status: 'complete' })).toBe(false)
    expect(isDeleteAccountBlocked({ status: 'partial' })).toBe(false)
  })
})
