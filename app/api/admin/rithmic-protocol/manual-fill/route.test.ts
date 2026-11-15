import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { NextRequest } from 'next/server'

const authorizeAdminRequest = vi.fn()
const insertManualRithmicProtocolFill = vi.fn()

vi.mock('@/lib/admin/auth', () => ({
  authorizeAdminRequest: (...args: unknown[]) => authorizeAdminRequest(...args),
}))
vi.mock('@/lib/rithmic-protocol/manual-fill', () => ({
  insertManualRithmicProtocolFill: (...args: unknown[]) =>
    insertManualRithmicProtocolFill(...args),
}))

import { POST } from './route'

const body = {
  userId: 'user-1',
  accountNumber: 'LFE050-I7X0S9B3-TEST001',
  symbol: 'MESZ6',
  exchange: 'CME',
  side: 'buy',
  qty: 2,
  price: 5810.25,
  timestamp: '2026-09-25T17:07:00+02:00',
  note: 'Rithmic order history omitted this 2-lot MESZ6 buy',
}

function post(payload: unknown, headers?: HeadersInit) {
  return POST(
    new NextRequest('http://localhost/api/admin/rithmic-protocol/manual-fill', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(payload),
    }),
  )
}

describe('POST /api/admin/rithmic-protocol/manual-fill', () => {
  beforeEach(() => {
    authorizeAdminRequest.mockReset()
    insertManualRithmicProtocolFill.mockReset()
  })

  it('rejects unauthenticated callers', async () => {
    authorizeAdminRequest.mockResolvedValue({ ok: false, status: 401 })
    const response = await post(body)
    expect(response.status).toBe(401)
    expect(insertManualRithmicProtocolFill).not.toHaveBeenCalled()
  })

  it('defaults omitted dryRun to a preview', async () => {
    authorizeAdminRequest.mockResolvedValue({
      ok: true,
      via: 'session',
      actorUserId: 'admin-1',
    })
    insertManualRithmicProtocolFill.mockResolvedValue({
      ok: true,
      dryRun: true,
      idempotent: false,
      fillId: 'manual-abc',
      identityKey: 'id|abc',
      note: body.note,
      fill: { fillId: 'manual-abc', source: 'manual' },
    })
    const response = await post(body)
    expect(response.status).toBe(200)
    expect(insertManualRithmicProtocolFill).toHaveBeenCalledWith(
      expect.objectContaining({ dryRun: true, qty: 2, note: body.note }),
    )
  })

  it('forwards dryRun false when an admin applies the patch', async () => {
    authorizeAdminRequest.mockResolvedValue({ ok: true, via: 'cron' })
    insertManualRithmicProtocolFill.mockResolvedValue({
      ok: true,
      dryRun: false,
      idempotent: false,
      fillId: 'manual-abc',
      identityKey: 'id|abc',
      note: body.note,
      fill: { fillId: 'manual-abc', source: 'manual' },
    })
    const response = await post({ ...body, dryRun: false })
    expect(response.status).toBe(200)
    expect(insertManualRithmicProtocolFill).toHaveBeenCalledWith(
      expect.objectContaining({ dryRun: false }),
    )
  })

  it('rejects a non-boolean dryRun before insert', async () => {
    authorizeAdminRequest.mockResolvedValue({
      ok: true,
      via: 'session',
      actorUserId: 'admin-1',
    })
    const response = await post({ ...body, dryRun: 'false' })
    expect(response.status).toBe(400)
    expect(insertManualRithmicProtocolFill).not.toHaveBeenCalled()
  })

  it('maps validation errors to 400 with field details', async () => {
    authorizeAdminRequest.mockResolvedValue({ ok: true, via: 'cron' })
    insertManualRithmicProtocolFill.mockResolvedValue({
      ok: false,
      status: 'validation',
      errors: [{ field: 'note', message: 'note (the reason for the patch) is required, up to 500 characters.' }],
    })
    const response = await post({ ...body, note: '' })
    expect(response.status).toBe(400)
    const payload = await response.json()
    expect(payload.error.code).toBe('bad_request')
    expect(payload.error.details).toEqual([
      expect.objectContaining({ field: 'note' }),
    ])
  })
})
