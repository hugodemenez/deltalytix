import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const {
  queryRaw,
  isLocalDashboardAuthBypassEnabled,
  getUserById,
} = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  isLocalDashboardAuthBypassEnabled: vi.fn(),
  getUserById: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: (...args: unknown[]) => queryRaw(...args),
  },
}))

vi.mock('@/lib/local-dashboard-auth', () => ({
  isLocalDashboardAuthBypassEnabled: () => isLocalDashboardAuthBypassEnabled(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      admin: {
        getUserById: (...args: unknown[]) => getUserById(...args),
      },
    },
  }),
}))

import {
  lookupSupabaseAuthEmail,
  shouldRefuseOrphanUserRecreation,
} from './supabase-auth'

describe('lookupSupabaseAuthEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isLocalDashboardAuthBypassEnabled.mockReturnValue(false)
  })

  it('returns none under local auth bypass', async () => {
    isLocalDashboardAuthBypassEnabled.mockReturnValue(true)
    await expect(lookupSupabaseAuthEmail('a@b.com')).resolves.toBe('none')
    expect(queryRaw).not.toHaveBeenCalled()
  })

  it('returns match when auth.users has the email', async () => {
    queryRaw.mockResolvedValue([{ id: 'auth-1' }])
    await expect(lookupSupabaseAuthEmail('User@Example.com')).resolves.toBe(
      'match',
    )
  })

  it('returns none when no auth.users row matches', async () => {
    queryRaw.mockResolvedValue([])
    await expect(lookupSupabaseAuthEmail('gone@example.com')).resolves.toBe(
      'none',
    )
  })

  it('returns unknown when the direct lookup throws', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    queryRaw.mockRejectedValue(new Error('auth schema unavailable'))
    await expect(lookupSupabaseAuthEmail('user@example.com')).resolves.toBe(
      'unknown',
    )
    errorSpy.mockRestore()
  })
})

describe('shouldRefuseOrphanUserRecreation', () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const originalKey = process.env.SUPABASE_SERVICE_KEY

  beforeEach(() => {
    vi.clearAllMocks()
    isLocalDashboardAuthBypassEnabled.mockReturnValue(false)
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_SERVICE_KEY = 'service-key'
  })

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl
    if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_KEY
    else process.env.SUPABASE_SERVICE_KEY = originalKey
  })

  it('does not refuse under local auth bypass', async () => {
    isLocalDashboardAuthBypassEnabled.mockReturnValue(true)
    await expect(shouldRefuseOrphanUserRecreation('auth-1')).resolves.toBe(
      false,
    )
    expect(getUserById).not.toHaveBeenCalled()
  })

  it('refuses when the auth user is gone (stale session)', async () => {
    getUserById.mockResolvedValue({
      data: { user: null },
      error: { message: 'User not found' },
    })
    await expect(shouldRefuseOrphanUserRecreation('auth-1')).resolves.toBe(true)
  })

  it('allows create when the auth user still exists', async () => {
    getUserById.mockResolvedValue({
      data: { user: { id: 'auth-1' } },
      error: null,
    })
    await expect(shouldRefuseOrphanUserRecreation('auth-1')).resolves.toBe(
      false,
    )
  })
})
