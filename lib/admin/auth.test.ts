import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const getUserId = vi.fn()

vi.mock('@/server/auth', () => ({
  getUserId: (...args: unknown[]) => getUserId(...args),
}))

import { authorizeAdminRequest, isAdminUserId } from './auth'

function requestWithAuth(header?: string) {
  return new Request('http://localhost/api/admin/rithmic-protocol/resync', {
    method: 'POST',
    headers: header ? { authorization: header } : undefined,
  })
}

describe('admin allowlist', () => {
  const previous = {
    ADMIN_USER_ID: process.env.ADMIN_USER_ID,
    ALLOWED_ADMIN_USER_ID: process.env.ALLOWED_ADMIN_USER_ID,
    ADMIN_USER_IDS: process.env.ADMIN_USER_IDS,
    CRON_SECRET: process.env.CRON_SECRET,
  }

  beforeEach(() => {
    getUserId.mockReset()
    process.env.ADMIN_USER_ID = 'admin-1'
    process.env.ALLOWED_ADMIN_USER_ID = 'admin-2'
    process.env.ADMIN_USER_IDS = 'admin-3, admin-4'
    process.env.CRON_SECRET = 'cron-secret'
  })

  afterEach(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })

  it('matches ADMIN_USER_ID, ALLOWED_ADMIN_USER_ID, and ADMIN_USER_IDS', () => {
    expect(isAdminUserId('admin-1')).toBe(true)
    expect(isAdminUserId('admin-2')).toBe(true)
    expect(isAdminUserId('admin-3')).toBe(true)
    expect(isAdminUserId('admin-4')).toBe(true)
    expect(isAdminUserId('user-other')).toBe(false)
  })

  it('rejects a missing session without a cron secret', async () => {
    getUserId.mockRejectedValue(new Error('User not authenticated'))
    const result = await authorizeAdminRequest(requestWithAuth())
    expect(result).toEqual({ ok: false, status: 401 })
  })

  it('rejects a signed-in user who is not on the allowlist', async () => {
    getUserId.mockResolvedValue('user-other')
    const result = await authorizeAdminRequest(requestWithAuth())
    expect(result).toEqual({ ok: false, status: 403 })
  })

  it('accepts an allowlisted session user', async () => {
    getUserId.mockResolvedValue('admin-1')
    const result = await authorizeAdminRequest(requestWithAuth())
    expect(result).toEqual({
      ok: true,
      via: 'session',
      actorUserId: 'admin-1',
    })
  })

  it('accepts the existing cron secret header without a session', async () => {
    getUserId.mockRejectedValue(new Error('User not authenticated'))
    const result = await authorizeAdminRequest(
      requestWithAuth('Bearer cron-secret'),
    )
    expect(result).toEqual({ ok: true, via: 'cron' })
    expect(getUserId).not.toHaveBeenCalled()
  })

  it('does not treat an empty CRON_SECRET as a match', async () => {
    delete process.env.CRON_SECRET
    getUserId.mockRejectedValue(new Error('User not authenticated'))
    const result = await authorizeAdminRequest(requestWithAuth('Bearer '))
    expect(result).toEqual({ ok: false, status: 401 })
  })

  it('does not treat CRON_SECRET="" as a match', async () => {
    process.env.CRON_SECRET = ''
    getUserId.mockRejectedValue(new Error('User not authenticated'))
    const result = await authorizeAdminRequest(requestWithAuth('Bearer '))
    expect(result).toEqual({ ok: false, status: 401 })
  })

  it('does not treat a whitespace-only CRON_SECRET as a match', async () => {
    process.env.CRON_SECRET = '   '
    getUserId.mockRejectedValue(new Error('User not authenticated'))
    const result = await authorizeAdminRequest(
      requestWithAuth('Bearer    '),
    )
    expect(result).toEqual({ ok: false, status: 401 })
  })

  it('rejects a wrong bearer token even when a secret is set', async () => {
    getUserId.mockRejectedValue(new Error('User not authenticated'))
    const result = await authorizeAdminRequest(
      requestWithAuth('Bearer not-the-secret'),
    )
    expect(result).toEqual({ ok: false, status: 401 })
  })
})
