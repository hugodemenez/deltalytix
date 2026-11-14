import { beforeEach, describe, expect, it, vi } from 'vitest'

const getUser = vi.fn()
const signOut = vi.fn()
const findFirst = vi.fn()
const transaction = vi.fn()
const deleteUserTradeRelatedRows = vi.fn()
const deleteUserTradeImageObjects = vi.fn()
const cancelStripeForEmail = vi.fn()
const deleteSupabaseAuthUser = vi.fn()
const recordPendingAccountCleanup = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findFirst },
    $transaction: transaction,
  },
}))

vi.mock('@/server/auth', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser, signOut },
  })),
}))

vi.mock('@/server/account-deletion/trade-rows', () => ({
  deleteUserTradeRelatedRows,
}))

vi.mock('@/server/account-deletion/storage', () => ({
  deleteUserTradeImageObjects,
}))

vi.mock('@/server/account-deletion/stripe', () => ({
  cancelStripeForEmail,
}))

vi.mock('@/server/account-deletion/supabase-auth', () => ({
  deleteSupabaseAuthUser,
}))

vi.mock('@/server/account-deletion/pending-cleanup', () => ({
  recordPendingAccountCleanup,
}))

function mockTx() {
  return {
    shared: { deleteMany: vi.fn() },
    team: { findMany: vi.fn(async () => []), update: vi.fn() },
    teamManager: { deleteMany: vi.fn() },
    business: { findMany: vi.fn(async () => []), update: vi.fn() },
    businessManager: { deleteMany: vi.fn() },
    newsletter: { deleteMany: vi.fn() },
    subscriptionFeedback: { deleteMany: vi.fn() },
    teamInvitation: { deleteMany: vi.fn() },
    businessInvitation: { deleteMany: vi.fn() },
    user: { delete: vi.fn() },
  }
}

describe('deleteCurrentUserAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getUser.mockResolvedValue({
      data: { user: { id: 'auth-1', email: 'user@example.com' } },
    })
    findFirst.mockResolvedValue({
      id: 'db-1',
      auth_user_id: 'auth-1',
      email: 'user@example.com',
    })
    transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(mockTx())
    })
    deleteUserTradeRelatedRows.mockResolvedValue(undefined)
    deleteUserTradeImageObjects.mockResolvedValue({ removed: 0 })
    cancelStripeForEmail.mockResolvedValue({ ok: true, customerIds: [] })
    deleteSupabaseAuthUser.mockResolvedValue(undefined)
    recordPendingAccountCleanup.mockResolvedValue({ id: 'pending-1' })
    signOut.mockResolvedValue(undefined)
  })

  it('throws Unauthorized before any delete when there is no session user', async () => {
    getUser.mockResolvedValue({ data: { user: null } })
    const { deleteCurrentUserAccount } = await import('./delete-account')

    await expect(deleteCurrentUserAccount()).rejects.toThrow('Unauthorized')
    expect(transaction).not.toHaveBeenCalled()
    expect(deleteUserTradeImageObjects).not.toHaveBeenCalled()
    expect(cancelStripeForEmail).not.toHaveBeenCalled()
    expect(deleteSupabaseAuthUser).not.toHaveBeenCalled()
    expect(signOut).not.toHaveBeenCalled()
  })

  it('runs cleanup in order: DB, storage, Stripe, then auth', async () => {
    const order: string[] = []
    transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      order.push('db')
      await fn(mockTx())
    })
    deleteUserTradeImageObjects.mockImplementation(async () => {
      order.push('storage')
      return { removed: 2 }
    })
    cancelStripeForEmail.mockImplementation(async () => {
      order.push('stripe')
      return { ok: true, customerIds: ['cus_1'] }
    })
    deleteSupabaseAuthUser.mockImplementation(async () => {
      order.push('auth')
    })

    const { deleteCurrentUserAccount } = await import('./delete-account')
    const result = await deleteCurrentUserAccount()

    expect(result).toEqual({ status: 'complete' })
    expect(order).toEqual(['db', 'storage', 'stripe', 'auth'])
    expect(signOut).toHaveBeenCalledTimes(1)
    expect(recordPendingAccountCleanup).not.toHaveBeenCalled()
    expect(transaction.mock.calls[0]?.[1]).toEqual({
      timeout: 60_000,
      maxWait: 10_000,
    })
  })

  it('returns partial, queues cleanup, and still deletes auth when storage fails', async () => {
    deleteUserTradeImageObjects.mockResolvedValue({
      removed: 0,
      error: 'list failed',
    })

    const { deleteCurrentUserAccount } = await import('./delete-account')
    const result = await deleteCurrentUserAccount()

    expect(result).toEqual({ status: 'partial' })
    expect(recordPendingAccountCleanup).toHaveBeenCalledWith(
      expect.objectContaining({
        authUserId: 'auth-1',
        formerUserId: 'db-1',
        storageFailed: true,
        stripeFailed: false,
      }),
    )
    expect(deleteSupabaseAuthUser).toHaveBeenCalledWith('auth-1')
    expect(signOut).toHaveBeenCalledTimes(1)
  })

  it('returns partial and queues Stripe failure after deleting the auth user', async () => {
    cancelStripeForEmail.mockResolvedValue({
      ok: false,
      error: 'stripe boom',
      customerIds: ['cus_x'],
    })

    const { deleteCurrentUserAccount } = await import('./delete-account')
    const result = await deleteCurrentUserAccount()

    expect(result).toEqual({ status: 'partial' })
    expect(recordPendingAccountCleanup).toHaveBeenCalledWith(
      expect.objectContaining({
        storageFailed: false,
        stripeFailed: true,
        stripeCustomerIds: ['cus_x'],
      }),
    )
    expect(deleteSupabaseAuthUser).toHaveBeenCalledWith('auth-1')
  })

  it('queues BOTH when storage and Stripe fail', async () => {
    deleteUserTradeImageObjects.mockResolvedValue({
      removed: 1,
      error: 'remove failed',
    })
    cancelStripeForEmail.mockResolvedValue({
      ok: false,
      error: 'stripe boom',
      customerIds: ['cus_y'],
    })

    const { deleteCurrentUserAccount } = await import('./delete-account')
    const result = await deleteCurrentUserAccount()

    expect(result).toEqual({ status: 'partial' })
    expect(recordPendingAccountCleanup).toHaveBeenCalledWith(
      expect.objectContaining({
        storageFailed: true,
        stripeFailed: true,
        stripeCustomerIds: ['cus_y'],
      }),
    )
    expect(deleteSupabaseAuthUser).toHaveBeenCalledWith('auth-1')
  })

  it('propagates transaction rejection before storage or auth work', async () => {
    transaction.mockRejectedValue(new Error('tx timeout'))

    const { deleteCurrentUserAccount } = await import('./delete-account')
    await expect(deleteCurrentUserAccount()).rejects.toThrow('tx timeout')
    expect(deleteUserTradeImageObjects).not.toHaveBeenCalled()
    expect(cancelStripeForEmail).not.toHaveBeenCalled()
    expect(deleteSupabaseAuthUser).not.toHaveBeenCalled()
    expect(recordPendingAccountCleanup).not.toHaveBeenCalled()
  })

  it('propagates auth-delete throw after cleanup attempts', async () => {
    deleteSupabaseAuthUser.mockRejectedValue(new Error('auth delete failed'))

    const { deleteCurrentUserAccount } = await import('./delete-account')
    await expect(deleteCurrentUserAccount()).rejects.toThrow('auth delete failed')
    expect(deleteUserTradeImageObjects).toHaveBeenCalled()
    expect(cancelStripeForEmail).toHaveBeenCalled()
    expect(signOut).not.toHaveBeenCalled()
  })
})
