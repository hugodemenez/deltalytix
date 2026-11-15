import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { findFirst, supabaseAuthUserExists } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  supabaseAuthUserExists: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    pendingAccountCleanup: { findFirst },
  },
}))

vi.mock('@/server/account-deletion/supabase-auth', () => ({
  supabaseAuthUserExists: (...args: unknown[]) =>
    supabaseAuthUserExists(...args),
}))

import {
  accountDeletedStatusForPendingCleanupRefusal,
  findUnresolvedPendingCleanupForAuthId,
} from './pending-cleanup-guard'

describe('findUnresolvedPendingCleanupForAuthId (ensureUserRecord refusal)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the unresolved cleanup row targeting the auth id', async () => {
    findFirst.mockResolvedValue({ id: 'pending-1' })
    await expect(
      findUnresolvedPendingCleanupForAuthId('auth-1'),
    ).resolves.toEqual({ id: 'pending-1' })
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        resolvedAt: null,
        OR: [
          { authUserId: 'auth-1' },
          { formerUserId: 'auth-1' },
          { storagePrefixes: { has: 'auth-1' } },
        ],
      },
      select: { id: true },
    })
  })

  it('returns null when no unresolved cleanup targets the auth id', async () => {
    findFirst.mockResolvedValue(null)
    await expect(
      findUnresolvedPendingCleanupForAuthId('auth-1'),
    ).resolves.toBeNull()
  })
})

describe('accountDeletedStatusForPendingCleanupRefusal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns partial_unrecorded when the auth user still exists', async () => {
    supabaseAuthUserExists.mockResolvedValue(true)
    await expect(
      accountDeletedStatusForPendingCleanupRefusal('auth-1'),
    ).resolves.toBe('partial_unrecorded')
    expect(supabaseAuthUserExists).toHaveBeenCalledWith('auth-1')
  })

  it('returns partial when the auth user is already gone', async () => {
    supabaseAuthUserExists.mockResolvedValue(false)
    await expect(
      accountDeletedStatusForPendingCleanupRefusal('auth-1'),
    ).resolves.toBe('partial')
  })
})
