import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const customersList = vi.fn()
const customersRetrieve = vi.fn()
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
      retrieve: (...args: unknown[]) => customersRetrieve(...args),
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
    vi.resetModules()
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

  it('fails closed when the subscription probe throws', async () => {
    customersList.mockReturnValue(asyncPage([{ id: 'cus_1' }]))
    subscriptionsList.mockRejectedValue(new Error('subs down'))

    const { listStripeCustomerIdsForEmails } = await import('./stripe')
    const result = await listStripeCustomerIdsForEmails(['a@example.com'])
    expect(result.ok).toBe(false)
    expect(result.customerIds).toEqual(['cus_1'])
    expect(result.error).toMatch(/subs down/i)
  })

  it('looks up both original and lowercased email variants', async () => {
    customersList.mockReturnValue(asyncPage([{ id: 'cus_1' }]))
    subscriptionsList.mockResolvedValue({ data: [] })

    const { listStripeCustomerIdsForEmails, stripeEmailLookupVariants } =
      await import('./stripe')
    expect(stripeEmailLookupVariants(['User@Example.com'])).toEqual([
      'User@Example.com',
      'user@example.com',
    ])
    await listStripeCustomerIdsForEmails(['User@Example.com'])
    expect(customersList).toHaveBeenCalledWith({
      email: 'User@Example.com',
      limit: 100,
    })
    expect(customersList).toHaveBeenCalledWith({
      email: 'user@example.com',
      limit: 100,
    })
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
  })
})

describe('cancelStripeCustomersByIds', () => {
  const originalKey = process.env.STRIPE_SECRET_KEY

  beforeEach(() => {
    vi.clearAllMocks()
    isLocalDashboardAuthBypassEnabled.mockReturnValue(false)
    process.env.STRIPE_SECRET_KEY = 'sk_test_unit'
    vi.resetModules()
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
    expect(customersDel).toHaveBeenCalledWith('cus_1')
  })

  it('returns ok:false when customer ids exist but Stripe is not configured', async () => {
    delete process.env.STRIPE_SECRET_KEY
    const { cancelStripeCustomersByIds } = await import('./stripe')
    const result = await cancelStripeCustomersByIds(['cus_1'])
    expect(result.ok).toBe(false)
    expect(result.customerIds).toEqual(['cus_1'])
    expect(result.error).toMatch(/not configured/i)
    expect(subscriptionsList).not.toHaveBeenCalled()
  })
})
