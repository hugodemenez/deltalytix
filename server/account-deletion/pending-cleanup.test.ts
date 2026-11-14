import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const {
  create,
  findMany,
  update,
  deleteRow,
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
  deleteRow: vi.fn(),
  deleteMany: vi.fn(),
  userFindFirst: vi.fn(),
  deleteUserTradeImageObjects: vi.fn(),
  cancelStripeCustomersByIds: vi.fn(),
  supabaseAuthUserExists: vi.fn(),
  isLocalDashboardAuthBypassEnabled: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    pendingAccountCleanup: {
      create,
      findMany,
      update,
      delete: deleteRow,
      deleteMany,
    },
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
  })
})

describe('retryPendingAccountCleanups', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isLocalDashboardAuthBypassEnabled.mockReturnValue(false)
    findMany.mockResolvedValue([])
    deleteRow.mockResolvedValue({})
    deleteMany.mockResolvedValue({ count: 0 })
    userFindFirst.mockResolvedValue(null)
    supabaseAuthUserExists.mockResolvedValue(false)
    deleteUserTradeImageObjects.mockResolvedValue({ removed: 1 })
    cancelStripeCustomersByIds.mockResolvedValue({
      ok: true,
      customerIds: ['cus_1'],
    })
  })

  it('dry-run performs no deletes and reports non-ok', async () => {
    findMany.mockResolvedValue([
      {
        id: 'row-1',
        failureKind: 'STRIPE',
        storagePrefixes: [],
        stripeCustomerIds: ['cus_1'],
        authUserId: 'auth-1',
        formerUserId: null,
      },
    ])

    const results = await retryPendingAccountCleanups({ dryRun: true })
    expect(results).toEqual([
      expect.objectContaining({
        id: 'row-1',
        ok: false,
        dryRun: true,
      }),
    ])
    expect(deleteMany).not.toHaveBeenCalled()
    expect(deleteRow).not.toHaveBeenCalled()
    expect(cancelStripeCustomersByIds).not.toHaveBeenCalled()
    expect(deleteUserTradeImageObjects).not.toHaveBeenCalled()
  })

  it('refuses to mark work resolved under LOCAL_DASHBOARD_AUTH_BYPASS', async () => {
    isLocalDashboardAuthBypassEnabled.mockReturnValue(true)
    findMany.mockResolvedValue([
      {
        id: 'row-1',
        failureKind: 'STRIPE',
        storagePrefixes: ['auth-1'],
        stripeCustomerIds: ['cus_1'],
        authUserId: 'auth-1',
        formerUserId: null,
      },
    ])

    const results = await retryPendingAccountCleanups()
    expect(results[0]).toMatchObject({ id: 'row-1', ok: false })
    expect(cancelStripeCustomersByIds).not.toHaveBeenCalled()
    expect(deleteRow).not.toHaveBeenCalled()
  })

  it('never resolves a STRIPE row with an empty customer id list', async () => {
    findMany.mockResolvedValue([
      {
        id: 'row-empty',
        failureKind: 'STRIPE',
        storagePrefixes: [],
        stripeCustomerIds: [],
        authUserId: 'auth-1',
        formerUserId: null,
      },
    ])

    const results = await retryPendingAccountCleanups()
    expect(results[0]).toMatchObject({
      ok: false,
      stripeError: expect.stringContaining('missing Stripe customer ids'),
    })
    expect(deleteRow).not.toHaveBeenCalled()
  })

  it('refuses storage cleanup when a User id is reoccupied', async () => {
    findMany.mockResolvedValue([
      {
        id: 'row-storage',
        failureKind: 'STORAGE',
        storagePrefixes: ['reused-id'],
        stripeCustomerIds: [],
        authUserId: 'auth-1',
        formerUserId: null,
      },
    ])
    userFindFirst.mockResolvedValue({ id: 'reused-id' })

    const results = await retryPendingAccountCleanups()
    expect(results[0]).toMatchObject({
      ok: false,
      storageError: expect.stringContaining('id still in use'),
    })
    expect(deleteUserTradeImageObjects).not.toHaveBeenCalled()
  })

  it('for legacy cuid prefixes, only checks the User table (skips auth lookup)', async () => {
    const cuid = 'clxyz0123456789abcdefghij'
    findMany.mockResolvedValue([
      {
        id: 'row-cuid',
        failureKind: 'STORAGE',
        storagePrefixes: [cuid],
        stripeCustomerIds: [],
        authUserId: cuid,
        formerUserId: null,
      },
    ])
    userFindFirst.mockResolvedValue(null)
    supabaseAuthUserExists.mockResolvedValue(true)

    const results = await retryPendingAccountCleanups()
    expect(supabaseAuthUserExists).not.toHaveBeenCalled()
    expect(deleteUserTradeImageObjects).toHaveBeenCalledWith([cuid])
    expect(results[0]).toMatchObject({ ok: true })
    expect(deleteRow).toHaveBeenCalledWith({ where: { id: 'row-cuid' } })
  })

  it('skips Stripe cancel when the auth or User record is live again', async () => {
    findMany.mockResolvedValue([
      {
        id: 'row-live',
        failureKind: 'STRIPE',
        storagePrefixes: [],
        stripeCustomerIds: ['cus_1'],
        authUserId: '550e8400-e29b-41d4-a716-446655440000',
        formerUserId: 'db-1',
      },
    ])
    userFindFirst.mockResolvedValue({ id: 'db-1' })

    const results = await retryPendingAccountCleanups()
    expect(results[0]).toMatchObject({
      ok: false,
      stripeError: expect.stringContaining('live again'),
    })
    expect(cancelStripeCustomersByIds).not.toHaveBeenCalled()
    expect(deleteRow).not.toHaveBeenCalled()
  })

  it('deletes the queue row when Stripe cleanup with known ids succeeds', async () => {
    findMany.mockResolvedValue([
      {
        id: 'row-ok',
        failureKind: 'STRIPE',
        storagePrefixes: [],
        stripeCustomerIds: ['cus_1'],
        authUserId: 'auth-1',
        formerUserId: null,
      },
    ])

    const results = await retryPendingAccountCleanups()
    expect(cancelStripeCustomersByIds).toHaveBeenCalledWith(['cus_1'])
    expect(deleteRow).toHaveBeenCalledWith({ where: { id: 'row-ok' } })
    expect(update).not.toHaveBeenCalled()
    expect(results[0]).toMatchObject({ id: 'row-ok', ok: true })
  })
})
