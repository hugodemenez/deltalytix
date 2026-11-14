import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const {
  create,
  findMany,
  update,
  deleteMany,
  userFindFirst,
  deleteUserTradeImageObjects,
  cancelStripeCustomersByIds,
  supabaseAuthUserExists,
  isLocalDashboardAuthBypassEnabled,
} = vi.hoisted(() => ({
  create: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
  userFindFirst: vi.fn(),
  deleteUserTradeImageObjects: vi.fn(),
  cancelStripeCustomersByIds: vi.fn(),
  supabaseAuthUserExists: vi.fn(),
  isLocalDashboardAuthBypassEnabled: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    pendingAccountCleanup: { create, findMany, update, deleteMany },
    user: { findFirst: userFindFirst },
  },
}))

vi.mock('@/lib/local-dashboard-auth', () => ({
  isLocalDashboardAuthBypassEnabled: () => isLocalDashboardAuthBypassEnabled(),
}))

vi.mock('@/server/account-deletion/storage', () => ({
  deleteUserTradeImageObjects: (...args: unknown[]) =>
    deleteUserTradeImageObjects(...args),
}))

vi.mock('@/server/account-deletion/stripe', () => ({
  cancelStripeCustomersByIds: (...args: unknown[]) =>
    cancelStripeCustomersByIds(...args),
}))

vi.mock('@/server/account-deletion/supabase-auth', () => ({
  supabaseAuthUserExists: (...args: unknown[]) =>
    supabaseAuthUserExists(...args),
}))

import { failureKindFromFlags } from './failure-kind'
import {
  recordPendingAccountCleanup,
  retryPendingAccountCleanups,
} from './pending-cleanup'

describe('failureKindFromFlags', () => {
  it('maps storage/stripe flags', () => {
    expect(failureKindFromFlags(true, false)).toBe('STORAGE')
    expect(failureKindFromFlags(false, true)).toBe('STRIPE')
    expect(failureKindFromFlags(true, true)).toBe('BOTH')
  })
})

describe('recordPendingAccountCleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    create.mockResolvedValue({ id: 'pending-1' })
  })

  it('returns null when nothing failed', async () => {
    await expect(
      recordPendingAccountCleanup({
        authUserId: 'auth-1',
        storagePrefixes: ['auth-1'],
        stripeCustomerIds: [],
        storageFailed: false,
        stripeFailed: false,
      }),
    ).resolves.toBeNull()
    expect(create).not.toHaveBeenCalled()
  })

  it('refuses to queue a STRIPE-only row with an empty customer id list', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(
      recordPendingAccountCleanup({
        formerUserId: 'db-1',
        authUserId: 'auth-1',
        storagePrefixes: ['db-1'],
        stripeCustomerIds: [],
        storageFailed: false,
        stripeFailed: true,
      }),
    ).resolves.toBeNull()
    expect(create).not.toHaveBeenCalled()
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('refusing to queue STRIPE'),
      expect.objectContaining({
        formerUserId: 'db-1',
        authUserId: 'auth-1',
      }),
    )
    errorSpy.mockRestore()
  })

  it('queues STRIPE rows that include customer ids', async () => {
    await expect(
      recordPendingAccountCleanup({
        authUserId: 'auth-1',
        storagePrefixes: [],
        stripeCustomerIds: ['cus_1'],
        storageFailed: false,
        stripeFailed: true,
      }),
    ).resolves.toEqual({ id: 'pending-1' })
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          failureKind: 'STRIPE',
          stripeCustomerIds: ['cus_1'],
        }),
      }),
    )
  })
})

describe('retryPendingAccountCleanups', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isLocalDashboardAuthBypassEnabled.mockReturnValue(false)
    deleteMany.mockResolvedValue({ count: 0 })
    findMany.mockResolvedValue([])
    update.mockResolvedValue({})
    userFindFirst.mockResolvedValue(null)
    supabaseAuthUserExists.mockResolvedValue(false)
    deleteUserTradeImageObjects.mockResolvedValue({ removed: 1 })
    cancelStripeCustomersByIds.mockResolvedValue({
      ok: true,
      customerIds: ['cus_1'],
    })
  })

  it('purges resolved rows older than 30 days before retrying', async () => {
    deleteMany.mockResolvedValue({ count: 2 })
    findMany.mockResolvedValue([])

    const results = await retryPendingAccountCleanups()
    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        resolvedAt: { not: null, lt: expect.any(Date) },
      },
    })
    expect(results).toEqual([])
  })

  it('refuses to mark work resolved under LOCAL_DASHBOARD_AUTH_BYPASS', async () => {
    isLocalDashboardAuthBypassEnabled.mockReturnValue(true)
    findMany.mockResolvedValue([
      {
        id: 'row-1',
        failureKind: 'STRIPE',
        storagePrefixes: ['auth-1'],
        stripeCustomerIds: ['cus_1'],
      },
    ])

    const results = await retryPendingAccountCleanups()
    expect(results).toEqual([
      expect.objectContaining({
        id: 'row-1',
        ok: false,
        storageError: expect.stringContaining('LOCAL_DASHBOARD_AUTH_BYPASS'),
        stripeError: expect.stringContaining('LOCAL_DASHBOARD_AUTH_BYPASS'),
      }),
    ])
    expect(cancelStripeCustomersByIds).not.toHaveBeenCalled()
    expect(deleteUserTradeImageObjects).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('never resolves a STRIPE row with an empty customer id list', async () => {
    findMany.mockResolvedValue([
      {
        id: 'row-empty',
        failureKind: 'STRIPE',
        storagePrefixes: [],
        stripeCustomerIds: [],
      },
    ])

    const results = await retryPendingAccountCleanups()
    expect(results[0]).toMatchObject({
      id: 'row-empty',
      ok: false,
      stripeError: expect.stringContaining('missing Stripe customer ids'),
    })
    expect(cancelStripeCustomersByIds).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('refuses storage cleanup when a User or auth id is reoccupied', async () => {
    findMany.mockResolvedValue([
      {
        id: 'row-storage',
        failureKind: 'STORAGE',
        storagePrefixes: ['reused-id'],
        stripeCustomerIds: [],
      },
    ])
    userFindFirst.mockResolvedValue({ id: 'reused-id' })

    const results = await retryPendingAccountCleanups()
    expect(results[0]).toMatchObject({
      id: 'row-storage',
      ok: false,
      storageError: expect.stringContaining('id still in use'),
    })
    expect(deleteUserTradeImageObjects).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('refuses storage cleanup when Supabase auth still has the id', async () => {
    findMany.mockResolvedValue([
      {
        id: 'row-auth',
        failureKind: 'STORAGE',
        storagePrefixes: ['auth-still-there'],
        stripeCustomerIds: [],
      },
    ])
    supabaseAuthUserExists.mockResolvedValue(true)

    const results = await retryPendingAccountCleanups()
    expect(results[0]).toMatchObject({
      ok: false,
      storageError: expect.stringContaining('auth-still-there'),
    })
    expect(deleteUserTradeImageObjects).not.toHaveBeenCalled()
  })

  it('marks resolved when Stripe cleanup with known ids succeeds', async () => {
    findMany.mockResolvedValue([
      {
        id: 'row-ok',
        failureKind: 'STRIPE',
        storagePrefixes: [],
        stripeCustomerIds: ['cus_1'],
      },
    ])

    const results = await retryPendingAccountCleanups()
    expect(cancelStripeCustomersByIds).toHaveBeenCalledWith(['cus_1'])
    expect(update).toHaveBeenCalledWith({
      where: { id: 'row-ok' },
      data: { resolvedAt: expect.any(Date) },
    })
    expect(results[0]).toMatchObject({ id: 'row-ok', ok: true })
  })
})
