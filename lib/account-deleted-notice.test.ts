import { describe, expect, it } from 'vitest'

import {
  accountDeletedHomeHref,
  parseAccountDeletedParam,
} from './account-deleted-notice'

describe('account deleted notice param', () => {
  it('accepts complete, partial, and partial_unrecorded', () => {
    expect(parseAccountDeletedParam('complete')).toBe('complete')
    expect(parseAccountDeletedParam('partial')).toBe('partial')
    expect(parseAccountDeletedParam('partial_unrecorded')).toBe(
      'partial_unrecorded',
    )
    expect(parseAccountDeletedParam('other')).toBeNull()
    expect(parseAccountDeletedParam(null)).toBeNull()
  })

  it('builds locale-aware home hrefs', () => {
    expect(accountDeletedHomeHref('en', 'complete')).toBe(
      '/?account_deleted=complete',
    )
    expect(accountDeletedHomeHref('fr', 'partial')).toBe(
      '/fr?account_deleted=partial',
    )
    expect(accountDeletedHomeHref('en', 'partial_unrecorded')).toBe(
      '/?account_deleted=partial_unrecorded',
    )
  })
})
