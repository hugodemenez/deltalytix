import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

function asyncPage<T>(items: T[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const item of items) yield item
    },
  }
}

describe('listStripeCustomerIdsForEmails', () => {
  const originalKey = process.env.STRIPE_SECRET_KEY

  beforeEach(() => {
    vi.clearAllMocks()
    isLocalDashboardAuthBypassEnabled.mockReturnValue(false)
    process.env.STRIPE_SECRET_KEY = 'sk_test_unit'
  })

  afterEach(() => {
    if (originalKey === undefined) delete process.env.STRIPE_SECRET_KEY
    else process.env.STRIPE_SECRET_KEY = originalKey
  })

  it('skips when Stripe is not configured', async () => {
    delete process.env.STRIPE_SECRET_KEY
    const { listStripeCustomerIdsForEmails } = await import('./stripe')
    const result = await listStripeCustomerIdsForEmails(['a@example.com'])
    expect(result).toEqual({
      ok: true,
      customerIds: [],
      skipped: true,
    })
    expect(customersList).not.toHaveBeenCalled()
  })

  it('fails closed when customers.list throws', async () => {
    customersList.mockImplementation(() => {
      throw new Error('stripe down')
    })
    const { listStripeCustomerIdsForEmails } = await import('./stripe')
    const result = await listStripeCustomerIdsForEmails(['a@example.com'])
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/stripe down/i)
  })

  it('auto-paginates customers.list beyond a single page', async () => {
    customersList.mockReturnValue(
      asyncPage([{ id: 'cus_1' }, { id: 'cus_2' }, { id: 'cus_3' }]),
    )
    subscriptionsList.mockResolvedValue({ data: [] })

    const { listStripeCustomerIdsForEmails } = await import('./stripe')
    const result = await listStripeCustomerIdsForEmails(['a@example.com'])
    expect(result).toEqual({
      ok: true,
      customerIds: ['cus_1', 'cus_2', 'cus_3'],
    })
    expect(customersList).toHaveBeenCalledWith({
      email: 'a@example.com',
      limit: 100,
    })
    expect(subscriptionsList).toHaveBeenCalledTimes(3)
  })
})

describe('cancelStripeCustomersByIds', () => {
  const originalKey = process.env.STRIPE_SECRET_KEY

  beforeEach(() => {
    vi.clearAllMocks()
    isLocalDashboardAuthBypassEnabled.mockReturnValue(false)
    process.env.STRIPE_SECRET_KEY = 'sk_test_unit'
  })

  afterEach(() => {
    if (originalKey === undefined) delete process.env.STRIPE_SECRET_KEY
    else process.env.STRIPE_SECRET_KEY = originalKey
  })

  it('cancels active subscriptions then deletes customers', async () => {
    subscriptionsList.mockReturnValue(
      asyncPage([
        { id: 'sub_1', status: 'active' },
        { id: 'sub_2', status: 'canceled' },
      ]),
    )
    customersDel.mockResolvedValue({})

    const { cancelStripeCustomersByIds } = await import('./stripe')
    const result = await cancelStripeCustomersByIds(['cus_1'])
    expect(result.ok).toBe(true)
    expect(subscriptionsCancel).toHaveBeenCalledWith('sub_1')
    expect(subscriptionsCancel).not.toHaveBeenCalledWith('sub_2')
    expect(customersDel).toHaveBeenCalledWith('cus_1')
  })

  it('skips cancel when Stripe is not configured', async () => {
    delete process.env.STRIPE_SECRET_KEY
    const { cancelStripeCustomersByIds } = await import('./stripe')
    const result = await cancelStripeCustomersByIds(['cus_1'])
    expect(result).toEqual({
      ok: true,
      customerIds: ['cus_1'],
      skipped: true,
    })
    expect(subscriptionsList).not.toHaveBeenCalled()
  })
})
