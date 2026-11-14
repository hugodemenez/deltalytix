import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const customersList = vi.fn()
const subscriptionsList = vi.fn()
const subscriptionsCancel = vi.fn()
const customersDel = vi.fn()
const isLocalDashboardAuthBypassEnabled = vi.fn()

vi.mock('@/lib/local-dashboard-auth', () => ({
  isLocalDashboardAuthBypassEnabled: () => isLocalDashboardAuthBypassEnabled(),
}))

vi.mock('@/server/stripe', () => ({
  stripe: {
    customers: {
      list: (...args: unknown[]) => customersList(...args),
      del: (...args: unknown[]) => customersDel(...args),
    },
    subscriptions: {
      list: (...args: unknown[]) => subscriptionsList(...args),
      cancel: (...args: unknown[]) => subscriptionsCancel(...args),
    },
  },
}))

import {
  cancelStripeCustomersByIds,
  listStripeCustomerIdsForEmails,
} from './stripe'

describe('listStripeCustomerIdsForEmails', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isLocalDashboardAuthBypassEnabled.mockReturnValue(false)
  })

  it('fails closed when customers.list throws', async () => {
    customersList.mockRejectedValue(new Error('stripe down'))
    const result = await listStripeCustomerIdsForEmails(['a@example.com'])
    expect(result.ok).toBe(false)
    expect(result.customerIds).toEqual([])
    expect(result.error).toMatch(/stripe down/i)
  })

  it('returns customer ids and probes subscriptions before wipe', async () => {
    customersList.mockResolvedValue({
      data: [{ id: 'cus_1' }, { id: 'cus_2' }],
    })
    subscriptionsList.mockResolvedValue({ data: [] })

    const result = await listStripeCustomerIdsForEmails(['a@example.com'])
    expect(result).toEqual({ ok: true, customerIds: ['cus_1', 'cus_2'] })
    expect(subscriptionsList).toHaveBeenCalledTimes(2)
  })

  it('fails closed when subscription probe throws after listing a customer', async () => {
    customersList.mockResolvedValue({ data: [{ id: 'cus_1' }] })
    subscriptionsList.mockRejectedValue(new Error('subs down'))

    const result = await listStripeCustomerIdsForEmails(['a@example.com'])
    expect(result.ok).toBe(false)
    expect(result.customerIds).toEqual(['cus_1'])
  })
})

describe('cancelStripeCustomersByIds', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isLocalDashboardAuthBypassEnabled.mockReturnValue(false)
  })

  it('cancels active subscriptions then deletes customers', async () => {
    subscriptionsList.mockResolvedValue({
      data: [
        { id: 'sub_1', status: 'active' },
        { id: 'sub_2', status: 'canceled' },
      ],
    })
    customersDel.mockResolvedValue({})

    const result = await cancelStripeCustomersByIds(['cus_1'])
    expect(result.ok).toBe(true)
    expect(subscriptionsCancel).toHaveBeenCalledWith('sub_1')
    expect(subscriptionsCancel).not.toHaveBeenCalledWith('sub_2')
    expect(customersDel).toHaveBeenCalledWith('cus_1')
  })

  it('refuses under local dashboard bypass', async () => {
    isLocalDashboardAuthBypassEnabled.mockReturnValue(true)
    const result = await cancelStripeCustomersByIds(['cus_1'])
    expect(result.ok).toBe(false)
    expect(subscriptionsList).not.toHaveBeenCalled()
  })
})
