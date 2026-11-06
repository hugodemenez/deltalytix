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

  it('rejects unauthenticated callers without leaking the cron secret', async () => {
    authorizeAdminRequest.mockResolvedValue({ ok: false, status: 401 })
    const response = await post({
      userId: 'user-1',
      accountNumber: 'LFE050-I7X0S9B3-TEST001',
      dryRun: true,
    })
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body).toMatchObject({
      error: { code: 'unauthorized' },
    })
    expect(JSON.stringify(body)).not.toMatch(/CRON_SECRET/)
    expect(resyncRithmicProtocolAccount).not.toHaveBeenCalled()
  })

  it('rejects signed-in non-admins', async () => {
    authorizeAdminRequest.mockResolvedValue({ ok: false, status: 403 })
    const response = await post({
      userId: 'user-1',
      accountNumber: 'LFE050-I7X0S9B3-TEST001',
      dryRun: true,
    })
    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'forbidden' },
    })
    expect(resyncRithmicProtocolAccount).not.toHaveBeenCalled()
  })

  it('rejects omitted dryRun so a live delete cannot be implied', async () => {
    authorizeAdminRequest.mockResolvedValue({
      ok: true,
      via: 'session',
      actorUserId: 'admin-1',
    })
    const response = await post({
      userId: 'user-1',
      accountNumber: 'LFE050-I7X0S9B3-TEST001',
    })
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'bad_request', message: 'dryRun is required.' },
    })
    expect(resyncRithmicProtocolAccount).not.toHaveBeenCalled()
  })

  it.each([
    ['true', 'true'],
    [1, 1],
    ['false', 'false'],
  ])('rejects non-boolean dryRun (%s)', async (_label, dryRun) => {
    authorizeAdminRequest.mockResolvedValue({
      ok: true,
      via: 'session',
      actorUserId: 'admin-1',
    })
    const response = await post({
      userId: 'user-1',
      accountNumber: 'LFE050-I7X0S9B3-TEST001',
      dryRun,
    })
    expect(response.status).toBe(400)
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
      complete: true,
      userId: 'user-1',
      accountNumber: 'LFE050-I7X0S9B3-TEST001',
      before: { tradeCount: 3, pnl: 12, fillCount: 8 },
      wouldDelete: { tradeCount: 3, pnl: 12, fillCount: 8 },
      proposed: { tradeCount: 2, pnl: 8, fillCount: 6, openSkipped: 0 },
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
      connectionId: undefined,
      allowUnmatchedAnnotations: undefined,
    })
  })

  it('returns a non-2xx body with result after an empty rebuild', async () => {
    authorizeAdminRequest.mockResolvedValue({
      ok: true,
      via: 'cron',
    })
    resyncRithmicProtocolAccount.mockResolvedValue({
      dryRun: false,
      complete: false,
      userId: 'user-1',
      accountNumber: 'LFE050-I7X0S9B3-TEST001',
      before: { tradeCount: 161, pnl: 825.5, fillCount: 236 },
      error: 'EMPTY_UPSTREAM_HISTORY',
    })
    const response = await post({
      userId: 'user-1',
      accountNumber: 'LFE050-I7X0S9B3-TEST001',
      dryRun: false,
    })
    expect(response.status).toBe(409)
    const body = await response.json()
    expect(body.error.code).toBe('conflict')
    expect(body.result.before.fillCount).toBe(236)
    expect(body.result.deleted).toBeUndefined()
  })

  it('returns 5xx for fetch failure without implying success', async () => {
    authorizeAdminRequest.mockResolvedValue({
      ok: true,
      via: 'session',
      actorUserId: 'admin-1',
    })
    resyncRithmicProtocolAccount.mockResolvedValue({
      dryRun: false,
      complete: false,
      userId: 'user-1',
      accountNumber: 'LFE050-I7X0S9B3-TEST001',
      before: { tradeCount: 3, pnl: 12, fillCount: 8 },
      error: 'FETCH_FAILED',
    })
    const response = await post({
      userId: 'user-1',
      accountNumber: 'LFE050-I7X0S9B3-TEST001',
      dryRun: false,
    })
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error.code).toBe('internal_error')
    expect(body.result.error).toBe('FETCH_FAILED')
    expect(body.error.hint).toMatch(/was not deleted/)
  })

  it('returns 409 for uncovered trades without writing a success body', async () => {
    authorizeAdminRequest.mockResolvedValue({
      ok: true,
      via: 'session',
      actorUserId: 'admin-1',
    })
    resyncRithmicProtocolAccount.mockResolvedValue({
      dryRun: false,
      complete: false,
      userId: 'user-1',
      accountNumber: 'LFE050-I7X0S9B3-TEST001',
      before: { tradeCount: 2, pnl: 15, fillCount: 2 },
      error: 'UNCOVERED_TRADES',
      proposed: { uncoveredTrades: [{ id: 't2', pnl: 5 }] },
    })
    const response = await post({
      userId: 'user-1',
      accountNumber: 'LFE050-I7X0S9B3-TEST001',
      dryRun: false,
    })
    expect(response.status).toBe(409)
    const body = await response.json()
    expect(body.error.code).toBe('conflict')
    expect(body.result.error).toBe('UNCOVERED_TRADES')
  })

  it('returns 200 after a committed rebuild even if a follow-up read failed', async () => {
    authorizeAdminRequest.mockResolvedValue({
      ok: true,
      via: 'cron',
    })
    resyncRithmicProtocolAccount.mockResolvedValue({
      dryRun: false,
      complete: true,
      committed: true,
      userId: 'user-1',
      accountNumber: 'LFE050-I7X0S9B3-TEST001',
      before: { tradeCount: 1, pnl: 10, fillCount: 2 },
      deleted: { trades: 1, fills: 0 },
      error: 'POST_COMMIT_WARNING',
    })
    const response = await post({
      userId: 'user-1',
      accountNumber: 'LFE050-I7X0S9B3-TEST001',
      dryRun: false,
    })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.error).toBe('POST_COMMIT_WARNING')
    expect(body.committed).toBe(true)
    expect(JSON.stringify(body)).not.toMatch(/was not deleted/i)
  })
})
