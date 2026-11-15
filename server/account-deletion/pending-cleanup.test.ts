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
  listStripeCustomerEmailsByIds,
  supabaseAuthUserExists,
  lookupSupabaseAuthEmail,
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
  listStripeCustomerEmailsByIds: vi.fn(),
  supabaseAuthUserExists: vi.fn(),
  lookupSupabaseAuthEmail: vi.fn(),
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
  listStripeCustomerEmailsByIds: (...args: unknown[]) =>
    listStripeCustomerEmailsByIds(...args),
}))

vi.mock('@/server/account-deletion/supabase-auth', () => ({
  supabaseAuthUserExists: (...args: unknown[]) =>
    supabaseAuthUserExists(...args),
  lookupSupabaseAuthEmail: (...args: unknown[]) =>
    lookupSupabaseAuthEmail(...args),
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
    lookupSupabaseAuthEmail.mockResolvedValue('none')
    deleteUserTradeImageObjects.mockResolvedValue({ removed: 1 })
    cancelStripeCustomersByIds.mockResolvedValue({
      ok: true,
      customerIds: ['cus_1'],
    })
    listStripeCustomerEmailsByIds.mockResolvedValue({
      ok: true,
      emails: ['user@example.com'],
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
    expect(results[0]).toMatchObject({ id: 'row-1', ok: false, dryRun: true })
    expect(deleteRow).not.toHaveBeenCalled()
    expect(cancelStripeCustomersByIds).not.toHaveBeenCalled()
  })

  it('dry-run also skips storage deletes', async () => {
    findMany.mockResolvedValue([
      {
        id: 'row-storage',
        failureKind: 'STORAGE',
        storagePrefixes: ['auth-1'],
        stripeCustomerIds: [],
        authUserId: 'auth-1',
        formerUserId: null,
      },
    ])

    const results = await retryPendingAccountCleanups({ dryRun: true })
    expect(results[0]).toMatchObject({
      id: 'row-storage',
      ok: false,
      dryRun: true,
      storageError: 'dry-run; no changes applied',
    })
    expect(deleteUserTradeImageObjects).not.toHaveBeenCalled()
    expect(deleteRow).not.toHaveBeenCalled()
  })

  it('refuses cleanup under local auth bypass', async () => {
    isLocalDashboardAuthBypassEnabled.mockReturnValue(true)
    findMany.mockResolvedValue([
      {
        id: 'row-bypass',
        failureKind: 'BOTH',
        storagePrefixes: ['auth-1'],
        stripeCustomerIds: ['cus_1'],
        authUserId: 'auth-1',
        formerUserId: null,
      },
    ])

    const results = await retryPendingAccountCleanups()
    expect(results[0]).toMatchObject({
      ok: false,
      storageError: expect.stringContaining('LOCAL_DASHBOARD_AUTH_BYPASS'),
      stripeError: expect.stringContaining('LOCAL_DASHBOARD_AUTH_BYPASS'),
    })
    expect(deleteUserTradeImageObjects).not.toHaveBeenCalled()
    expect(cancelStripeCustomersByIds).not.toHaveBeenCalled()
  })

  it('keeps STRIPE rows that have an empty customer id list', async () => {
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
    expect(cancelStripeCustomersByIds).not.toHaveBeenCalled()
    expect(deleteRow).not.toHaveBeenCalled()
  })

  it('keeps STRIPE rows when cancel returns not configured', async () => {
    findMany.mockResolvedValue([
      {
        id: 'row-stripe',
        failureKind: 'STRIPE',
        storagePrefixes: [],
        stripeCustomerIds: ['cus_1'],
        authUserId: 'auth-1',
        formerUserId: null,
      },
    ])
    cancelStripeCustomersByIds.mockResolvedValue({
      ok: false,
      customerIds: ['cus_1'],
      error: 'Stripe not configured; refusing to clear queued Stripe customer ids',
    })

    const results = await retryPendingAccountCleanups()
    expect(results[0]).toMatchObject({
      ok: false,
      stripeError: expect.stringContaining('not configured'),
    })
    expect(deleteRow).not.toHaveBeenCalled()
  })

  it('refuses UUID storage cleanup when auth user still exists', async () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000'
    findMany.mockResolvedValue([
      {
        id: 'row-uuid',
        failureKind: 'STORAGE',
        storagePrefixes: [uuid],
        stripeCustomerIds: [],
        authUserId: uuid,
        formerUserId: null,
      },
    ])
    userFindFirst.mockResolvedValue(null)
    supabaseAuthUserExists.mockResolvedValue(true)

    const results = await retryPendingAccountCleanups()
    expect(supabaseAuthUserExists).toHaveBeenCalledWith(uuid)
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

  it('skips Stripe cancel when a live User email matches the Stripe customer', async () => {
    findMany.mockResolvedValue([
      {
        id: 'row-email',
        failureKind: 'STRIPE',
        storagePrefixes: [],
        stripeCustomerIds: ['cus_1'],
        authUserId: 'auth-old',
        formerUserId: null,
      },
    ])
    listStripeCustomerEmailsByIds.mockResolvedValue({
      ok: true,
      emails: ['billing@example.com'],
    })
    userFindFirst.mockImplementation(async (args: { where?: { email?: unknown } }) => {
      if (args?.where && 'email' in (args.where as object)) {
        return { id: 'new-user' }
      }
      return null
    })

    const results = await retryPendingAccountCleanups()
    expect(results[0]).toMatchObject({
      ok: false,
      stripeError: expect.stringContaining('live User email'),
    })
    expect(cancelStripeCustomersByIds).not.toHaveBeenCalled()
    expect(deleteRow).not.toHaveBeenCalled()
  })

  it('skips Stripe cancel when a live auth email matches the Stripe customer', async () => {
    findMany.mockResolvedValue([
      {
        id: 'row-auth-email',
        failureKind: 'STRIPE',
        storagePrefixes: [],
        stripeCustomerIds: ['cus_1'],
        authUserId: 'auth-old',
        formerUserId: null,
      },
    ])
    listStripeCustomerEmailsByIds.mockResolvedValue({
      ok: true,
      emails: ['billing@example.com'],
    })
    lookupSupabaseAuthEmail.mockResolvedValue('match')

    const results = await retryPendingAccountCleanups()
    expect(lookupSupabaseAuthEmail).toHaveBeenCalledWith('billing@example.com')
    expect(results[0]).toMatchObject({
      ok: false,
      stripeError: expect.stringContaining('live auth email'),
    })
    expect(cancelStripeCustomersByIds).not.toHaveBeenCalled()
  })

  it('keeps the Stripe row when auth email lookup is unknown', async () => {
    findMany.mockResolvedValue([
      {
        id: 'row-auth-unknown',
        failureKind: 'STRIPE',
        storagePrefixes: [],
        stripeCustomerIds: ['cus_1'],
        authUserId: 'auth-old',
        formerUserId: null,
      },
    ])
    listStripeCustomerEmailsByIds.mockResolvedValue({
      ok: true,
      emails: ['billing@example.com'],
    })
    lookupSupabaseAuthEmail.mockResolvedValue('unknown')

    const results = await retryPendingAccountCleanups()
    expect(results[0]).toMatchObject({
      ok: false,
      stripeError: expect.stringContaining('auth email lookup unknown'),
    })
    expect(cancelStripeCustomersByIds).not.toHaveBeenCalled()
    expect(deleteRow).not.toHaveBeenCalled()
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
    expect(results[0]).toMatchObject({ id: 'row-ok', ok: true })
  })
})
