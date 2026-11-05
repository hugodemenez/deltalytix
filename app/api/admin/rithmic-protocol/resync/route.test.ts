import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { NextRequest } from 'next/server'

const authorizeAdminRequest = vi.fn()
const resyncRithmicProtocolAccount = vi.fn()

vi.mock('@/lib/admin/auth', () => ({
  authorizeAdminRequest: (...args: unknown[]) => authorizeAdminRequest(...args),
}))
vi.mock('@/lib/rithmic-protocol/admin-account-resync', () => ({
  resyncRithmicProtocolAccount: (...args: unknown[]) =>
    resyncRithmicProtocolAccount(...args),
}))

import { POST } from './route'

function post(body: unknown, headers?: HeadersInit) {
  return POST(
    new NextRequest('http://localhost/api/admin/rithmic-protocol/resync', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    }),
  )
}

describe('POST /api/admin/rithmic-protocol/resync', () => {
  beforeEach(() => {
    authorizeAdminRequest.mockReset()
    resyncRithmicProtocolAccount.mockReset()
  })

  it('rejects unauthenticated callers', async () => {
    authorizeAdminRequest.mockResolvedValue({ ok: false, status: 401 })
    const response = await post({
      userId: 'user-1',
      accountNumber: 'LFE050-I7X0S9B3-TEST001',
    })
    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'unauthorized' },
    })
    expect(resyncRithmicProtocolAccount).not.toHaveBeenCalled()
  })

  it('rejects signed-in non-admins', async () => {
    authorizeAdminRequest.mockResolvedValue({ ok: false, status: 403 })
    const response = await post({
      userId: 'user-1',
      accountNumber: 'LFE050-I7X0S9B3-TEST001',
    })
    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'forbidden' },
    })
    expect(resyncRithmicProtocolAccount).not.toHaveBeenCalled()
  })

  it('runs a dry-run without calling other accounts', async () => {
    authorizeAdminRequest.mockResolvedValue({
      ok: true,
      via: 'session',
      actorUserId: 'admin-1',
    })
    resyncRithmicProtocolAccount.mockResolvedValue({
      dryRun: true,
      userId: 'user-1',
      accountNumber: 'LFE050-I7X0S9B3-TEST001',
      before: { tradeCount: 3, pnl: 12, fillCount: 8 },
      wouldDelete: { tradeCount: 3, pnl: 12, fillCount: 8 },
    })
    const response = await post({
      userId: 'user-1',
      accountNumber: 'LFE050-I7X0S9B3-TEST001',
      dryRun: true,
    })
    expect(response.status).toBe(200)
    expect(resyncRithmicProtocolAccount).toHaveBeenCalledWith({
      userId: 'user-1',
      accountNumber: 'LFE050-I7X0S9B3-TEST001',
      dryRun: true,
      actor: 'admin-1',
    })
  })
})
