import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { NextRequest } from 'next/server'

const authorizeAdminRequest = vi.fn()
const insertManualRithmicProtocolFill = vi.fn()
const retireManualRithmicProtocolFill = vi.fn()

vi.mock('@/lib/admin/auth', () => ({
  authorizeAdminRequest: (...args: unknown[]) => authorizeAdminRequest(...args),
}))
vi.mock('@/lib/rithmic-protocol/manual-fill', () => ({
  insertManualRithmicProtocolFill: (...args: unknown[]) =>
    insertManualRithmicProtocolFill(...args),
  retireManualRithmicProtocolFill: (...args: unknown[]) =>
    retireManualRithmicProtocolFill(...args),
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
    retireManualRithmicProtocolFill.mockReset()
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

  it('refuses an unacknowledged apply with 409', async () => {
    authorizeAdminRequest.mockResolvedValue({ ok: true, via: 'cron' })
    insertManualRithmicProtocolFill.mockResolvedValue({
      ok: false,
      status: 'acknowledgement_required',
      errors: [{ field: 'acknowledgeWarnings', message: 'Apply refused.' }],
      warnings: ['Near-miss with upstream fill 88421 (clock).'],
    })
    const response = await post({ ...body, dryRun: false })
    expect(response.status).toBe(409)
    const payload = await response.json()
    expect(payload.error.code).toBe('conflict')
    expect(payload.error.hint).toMatch(/acknowledgeWarnings: true/)
    expect(payload.error.hint).toMatch(/retire/)
    expect(insertManualRithmicProtocolFill).toHaveBeenCalledWith(
      expect.objectContaining({ dryRun: false }),
    )
    expect(retireManualRithmicProtocolFill).not.toHaveBeenCalled()
  })

  it('previews a retire and stamps the admin as retiredBy', async () => {
    authorizeAdminRequest.mockResolvedValue({
      ok: true,
      via: 'session',
      actorUserId: 'admin-1',
    })
    retireManualRithmicProtocolFill.mockResolvedValue({
      ok: true,
      dryRun: true,
      idempotent: false,
      fillId: 'manual-gap',
      source: 'manual-retired',
      retiredAt: '2026-09-26T12:00:00.000Z',
      retiredBy: 'admin-1',
      retireReason: 'plant fill arrived',
    })
    const response = await post({
      action: 'retire',
      userId: body.userId,
      accountNumber: body.accountNumber,
      fillId: 'manual-gap',
      reason: 'plant fill arrived',
    })
    expect(response.status).toBe(200)
    expect(retireManualRithmicProtocolFill).toHaveBeenCalledWith(
      expect.objectContaining({
        dryRun: true,
        retiredBy: 'admin-1',
        fillId: 'manual-gap',
        reason: 'plant fill arrived',
      }),
    )
    expect(insertManualRithmicProtocolFill).not.toHaveBeenCalled()
  })

  it('refuses an unacknowledged retire of an annotated trade with 409', async () => {
    authorizeAdminRequest.mockResolvedValue({ ok: true, via: 'cron' })
    retireManualRithmicProtocolFill.mockResolvedValue({
      ok: false,
      status: 'acknowledgement_required',
      errors: [{ field: 'acknowledgeAnnotatedTrades', message: 'Apply refused.' }],
      trades: [
        {
          id: 'stored-manual-trade',
          entryId: 'manual-gap',
          closeId: '1002',
          instrument: 'MES',
          annotated: true,
        },
      ],
    })
    const response = await post({
      action: 'retire',
      userId: body.userId,
      accountNumber: body.accountNumber,
      fillId: 'manual-gap',
      reason: 'wrong price',
      dryRun: false,
    })
    expect(response.status).toBe(409)
    const payload = await response.json()
    expect(payload.error.code).toBe('conflict')
    expect(payload.error.hint).toMatch(/acknowledgeAnnotatedTrades: true/)
    expect(payload.error.hint).toMatch(/delete/)
    expect(payload.error.details[0].message).toMatch(/stored-manual-trade/)
    expect(insertManualRithmicProtocolFill).not.toHaveBeenCalled()
  })
})
