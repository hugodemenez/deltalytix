import { describe, expect, it } from 'vitest'
import { getDxFeedConnectFieldErrors } from './dxfeed-connect-fields'

describe('getDxFeedConnectFieldErrors', () => {
  it('accepts a non-email username', () => {
    expect(
      getDxFeedConnectFieldErrors({
        username: 'trader_ht50',
        password: 'secret',
      }),
    ).toEqual([])
  })

  it('still accepts an email username', () => {
    expect(
      getDxFeedConnectFieldErrors({
        username: 'trader@hyperticks.com',
        password: 'secret',
      }),
    ).toEqual([])
  })

  it('requires a non-empty username and password', () => {
    expect(
      getDxFeedConnectFieldErrors({
        username: '   ',
        password: '',
      }),
    ).toEqual(['username', 'password'])
  })
})
