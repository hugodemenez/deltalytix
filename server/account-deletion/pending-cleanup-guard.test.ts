import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { findFirst } = vi.hoisted(() => ({
  findFirst: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    pendingAccountCleanup: { findFirst },
  },
}))

import { findUnresolvedPendingCleanupForAuthId } from './pending-cleanup-guard'

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
