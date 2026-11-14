import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { queryRaw, isLocalDashboardAuthBypassEnabled } = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  isLocalDashboardAuthBypassEnabled: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: (...args: unknown[]) => queryRaw(...args),
  },
}))

vi.mock('@/lib/local-dashboard-auth', () => ({
  isLocalDashboardAuthBypassEnabled: () => isLocalDashboardAuthBypassEnabled(),
}))

import { lookupSupabaseAuthEmail } from './supabase-auth'

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
