import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getUserMock, incomingHeaders } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  incomingHeaders: new Map<string, string>(),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
  headers: vi.fn(async () => ({
    get: (name: string) => incomingHeaders.get(name.toLowerCase()) ?? null,
  })),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: getUserMock,
    },
  })),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {},
}))

import { getUserEmail, getUserId } from './auth'

describe('auth helpers', () => {
  beforeEach(() => {
    incomingHeaders.clear()
    getUserMock.mockReset()
  })

  it('does not authenticate from a spoofed x-user-id header', async () => {
    incomingHeaders.set('x-user-id', 'victim-user-id')
    getUserMock.mockResolvedValue({ data: { user: null }, error: null })

    await expect(getUserId()).rejects.toThrow('User not authenticated')
    expect(getUserMock).toHaveBeenCalledTimes(1)
  })

  it('returns the Supabase user id even when a spoofed header is present', async () => {
    incomingHeaders.set('x-user-id', 'victim-user-id')
    getUserMock.mockResolvedValue({
      data: { user: { id: 'actual-user-id', email: 'actual@example.com' } },
      error: null,
    })

    await expect(getUserId()).resolves.toBe('actual-user-id')
  })

  it('does not read subscription email from a spoofed x-user-email header', async () => {
    incomingHeaders.set('x-user-email', 'paid@rithmic.com')
    getUserMock.mockResolvedValue({ data: { user: null }, error: null })

    await expect(getUserEmail()).resolves.toBe('')
    expect(getUserMock).toHaveBeenCalledTimes(1)
  })
})
