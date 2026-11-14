import { describe, expect, it } from 'vitest'

import {
  accountDeletedHomeHref,
  parseAccountDeletedParam,
} from './account-deleted-notice'

describe('account deleted notice param', () => {
  it('accepts complete and partial only', () => {
    expect(parseAccountDeletedParam('complete')).toBe('complete')
    expect(parseAccountDeletedParam('partial')).toBe('partial')
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
  })
})
