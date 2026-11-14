import { describe, expect, it } from 'vitest'

import {
  ACCOUNT_DELETION_STRIPE_PRECHECK_FAILED,
  AccountDeletionAbortError,
  isAccountDeletionStripePrecheckError,
} from './account-deletion-errors'

describe('account deletion stripe precheck errors', () => {
  it('detects the abort class and serialized message', () => {
    expect(
      isAccountDeletionStripePrecheckError(new AccountDeletionAbortError()),
    ).toBe(true)
    expect(
      isAccountDeletionStripePrecheckError(
        new Error(ACCOUNT_DELETION_STRIPE_PRECHECK_FAILED),
      ),
    ).toBe(true)
    expect(isAccountDeletionStripePrecheckError(new Error('other'))).toBe(false)
    expect(isAccountDeletionStripePrecheckError('nope')).toBe(false)
  })
})
