import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const connect = vi.fn()
const login = vi.fn()
const loginInfo = vi.fn()
const listAccounts = vi.fn()
const getProductRmsInfo = vi.fn()
const getFillHistory = vi.fn()
const getFillsViaOrderHistory = vi.fn()
const replayExecutions = vi.fn()
const close = vi.fn()

vi.mock('./client', () => ({
  RithmicProtocolClient: class {
    connect = (...args: unknown[]) => connect(...args)
    login = (...args: unknown[]) => login(...args)
    loginInfo = (...args: unknown[]) => loginInfo(...args)
    listAccounts = (...args: unknown[]) => listAccounts(...args)
    getProductRmsInfo = (...args: unknown[]) => getProductRmsInfo(...args)
    getFillHistory = (...args: unknown[]) => getFillHistory(...args)
    getFillsViaOrderHistory = (...args: unknown[]) =>
      getFillsViaOrderHistory(...args)
    replayExecutions = (...args: unknown[]) => replayExecutions(...args)
    close = (...args: unknown[]) => close(...args)
  },
}))

import { AdminFillFetchError, fetchAdminRebuildFills } from './admin-fill-fetch'

const BASE = {
  gatewayUri: 'wss://example.test',
  systemName: 'Rithmic',
  username: 'u',
  password: 'p',
  accountId: 'A',
  historyStartDate: '2026-10-30',
}

describe('fetchAdminRebuildFills', () => {
  beforeEach(() => {
    connect.mockReset().mockResolvedValue(undefined)
    login.mockReset().mockResolvedValue({ fcmId: 'fcm', ibId: 'ib' })
    loginInfo.mockReset().mockResolvedValue({
      fcmId: 'fcm',
      ibId: 'ib',
      userType: 3,
    })
    listAccounts.mockReset().mockResolvedValue([
      { accountId: 'A', fcmId: 'fcm', ibId: 'ib' },
    ])
    getProductRmsInfo.mockReset().mockResolvedValue([
      { accountId: 'A', productCode: 'MES', commissionFillRate: 1 },
    ])
    getFillHistory.mockReset().mockImplementation(
      async (params: { observe?: { onComplete?: (info: unknown) => void } }) => {
        params.observe?.onComplete?.({
          rpCode: ['0'],
          noData: false,
          ok: true,
          fillCount: 1,
          rowAttempts: 1,
          hitCap: false,
        })
        return [
          {
            accountId: 'A',
            symbol: 'MESZ6',
            transactionType: 'BUY',
            fillPrice: 1,
            fillSize: 1,
            fillId: '1',
            fillDate: '20261030',
            ssboe: 1_800_000_000,
          },
        ]
      },
    )
    getFillsViaOrderHistory.mockReset().mockResolvedValue([])
    replayExecutions.mockReset().mockResolvedValue([])
    close.mockReset().mockResolvedValue(undefined)
  })

  it('refuses an invalid history start before opening a socket', async () => {
    await expect(
      fetchAdminRebuildFills({ ...BASE, historyStartDate: 'not-a-date' }),
    ).rejects.toMatchObject({
      name: 'AdminFillFetchError',
      code: 'FETCH_FAILED',
    })
    expect(connect).not.toHaveBeenCalled()
  })

  it('names timeout vs generic fetch failures', () => {
    const timeout = new AdminFillFetchError('FILL_FETCH_TIMEOUT', 'timed out')
    expect(timeout.code).toBe('FILL_FETCH_TIMEOUT')
    expect(timeout).toBeInstanceOf(Error)
  })

  it('refuses an empty Order-plant account list (L6)', async () => {
    listAccounts.mockResolvedValueOnce([])
    await expect(fetchAdminRebuildFills(BASE)).rejects.toMatchObject({
      code: 'ACCOUNT_NOT_FOUND',
    })
  })

  it('refuses a window at the 10,000-record cap (L2)', async () => {
    getFillHistory.mockImplementationOnce(
      async (params: { observe?: { onComplete?: (info: unknown) => void } }) => {
        params.observe?.onComplete?.({
          rpCode: ['0'],
          noData: false,
          ok: true,
          fillCount: 10_000,
          rowAttempts: 10_000,
          hitCap: true,
        })
        return []
      },
    )
    await expect(fetchAdminRebuildFills(BASE)).rejects.toMatchObject({
      code: 'HISTORY_TRUNCATED',
    })
  })

  it('runs order-history fallback for rp_code 7 and refuses if the window stays unresolved (H2)', async () => {
    getFillHistory.mockImplementation(
      async (params: { observe?: { onComplete?: (info: unknown) => void } }) => {
        params.observe?.onComplete?.({
          rpCode: ['7'],
          noData: true,
          ok: false,
          fillCount: 0,
          rowAttempts: 0,
          hitCap: false,
        })
        return []
      },
    )
    getFillsViaOrderHistory.mockRejectedValueOnce(new Error('fallback down'))
    await expect(fetchAdminRebuildFills(BASE)).rejects.toMatchObject({
      code: 'INCOMPLETE_FILL_HISTORY',
    })
    expect(getFillsViaOrderHistory).toHaveBeenCalled()
  })

  it('refuses rp_code 7 when order-history returns no dates or fills (N3)', async () => {
    getFillHistory.mockImplementation(
      async (params: { observe?: { onComplete?: (info: unknown) => void } }) => {
        params.observe?.onComplete?.({
          rpCode: ['7'],
          noData: true,
          ok: false,
          fillCount: 0,
          rowAttempts: 0,
          hitCap: false,
        })
        return []
      },
    )
    getFillsViaOrderHistory.mockImplementation(
      async (params: { onHistoryDates?: (dates: string[]) => void }) => {
        params.onHistoryDates?.([])
        return []
      },
    )
    await expect(fetchAdminRebuildFills(BASE)).rejects.toMatchObject({
      code: 'INCOMPLETE_FILL_HISTORY',
    })
  })

  it('reports RMS empty without inventing rates (M4)', async () => {
    getProductRmsInfo.mockResolvedValueOnce([])
    const result = await fetchAdminRebuildFills(BASE)
    expect(result.commissionStatus).toBe('empty')
    expect(result.commissionRates.size).toBe(0)
    expect(result.coverage.every((window) => window.resolved)).toBe(true)
  })
})
