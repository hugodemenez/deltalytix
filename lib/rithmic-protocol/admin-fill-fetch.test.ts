import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { AdminFillFetchError, fetchAdminRebuildFills } from './admin-fill-fetch'

describe('fetchAdminRebuildFills', () => {
  it('refuses an invalid history start before opening a socket', async () => {
    await expect(
      fetchAdminRebuildFills({
        gatewayUri: 'wss://example.test',
        systemName: 'Rithmic',
        username: 'u',
        password: 'p',
        accountId: 'A',
        historyStartDate: 'not-a-date',
      }),
    ).rejects.toMatchObject({
      name: 'AdminFillFetchError',
      code: 'FETCH_FAILED',
    })
  })

  it('names timeout vs generic fetch failures', () => {
    const timeout = new AdminFillFetchError('FILL_FETCH_TIMEOUT', 'timed out')
    expect(timeout.code).toBe('FILL_FETCH_TIMEOUT')
    expect(timeout).toBeInstanceOf(Error)
  })
})
