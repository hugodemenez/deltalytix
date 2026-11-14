import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { NextRequest } from 'next/server'

const authorizeAdminRequest = vi.fn()
const retryPendingAccountCleanups = vi.fn()

vi.mock('@/lib/admin/auth', () => ({
  authorizeAdminRequest: (...args: unknown[]) => authorizeAdminRequest(...args),
}))
vi.mock('@/server/account-deletion/pending-cleanup', () => ({
  retryPendingAccountCleanups: (...args: unknown[]) =>
    retryPendingAccountCleanups(...args),
}))

import { POST } from './route'

function post(body?: unknown, headers?: HeadersInit) {
  return POST(
    new NextRequest('http://localhost/api/admin/pending-account-cleanup', {
      method: 'POST',
      headers: {
        ...(body !== undefined
          ? { 'content-type': 'application/json' }
          : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  )
}

describe('POST /api/admin/pending-account-cleanup', () => {
  beforeEach(() => {
    authorizeAdminRequest.mockReset()
    retryPendingAccountCleanups.mockReset()
  })

  it('rejects unauthenticated callers', async () => {
    authorizeAdminRequest.mockResolvedValue({ ok: false, status: 401 })
    const response = await post({ dryRun: true })
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body).toMatchObject({ error: { code: 'unauthorized' } })
    expect(JSON.stringify(body)).not.toMatch(/sk_live|actual.secret/i)
    expect(retryPendingAccountCleanups).not.toHaveBeenCalled()
  })

  it('rejects signed-in non-admins', async () => {
    authorizeAdminRequest.mockResolvedValue({ ok: false, status: 403 })
    const response = await post({})
    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'forbidden' },
    })
    expect(retryPendingAccountCleanups).not.toHaveBeenCalled()
  })

  it('rejects invalid JSON bodies', async () => {
    authorizeAdminRequest.mockResolvedValue({
      ok: true,
      via: 'session',
      actorUserId: 'admin-1',
    })
    const response = await POST(
      new NextRequest('http://localhost/api/admin/pending-account-cleanup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{not-json',
      }),
    )
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'bad_request' },
    })
    expect(retryPendingAccountCleanups).not.toHaveBeenCalled()
  })

  it('retries as admin with optional id and dryRun', async () => {
    authorizeAdminRequest.mockResolvedValue({
      ok: true,
      via: 'cron',
    })
    retryPendingAccountCleanups.mockResolvedValue([
      {
        id: 'row-1',
        ok: false,
        dryRun: true,
        storageError: 'dry-run; no changes applied',
        stripeError: 'dry-run; no changes applied',
      },
    ])

    const response = await post({ id: 'row-1', dryRun: true })
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      results: [
        {
          id: 'row-1',
          ok: false,
          dryRun: true,
          storageError: 'dry-run; no changes applied',
          stripeError: 'dry-run; no changes applied',
        },
      ],
    })
    expect(retryPendingAccountCleanups).toHaveBeenCalledWith({
      id: 'row-1',
      dryRun: true,
    })
  })
})

