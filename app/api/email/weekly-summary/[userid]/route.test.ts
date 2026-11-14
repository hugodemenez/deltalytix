import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const authorizeAdminRequest = vi.fn()
const buildWeeklyRecapEmail = vi.fn()

vi.mock('@/lib/admin/auth', () => ({
  authorizeAdminRequest: (...args: unknown[]) => authorizeAdminRequest(...args),
}))
vi.mock('@/lib/weekly-recap-email', () => ({
  buildWeeklyRecapEmail: (...args: unknown[]) => buildWeeklyRecapEmail(...args),
}))

import { POST } from './route'

describe('POST /api/email/weekly-summary/[userid]', () => {
  beforeEach(() => {
    authorizeAdminRequest.mockReset()
    buildWeeklyRecapEmail.mockReset()
  })

  it('rejects the old CRON_SECRET bearer', async () => {
    authorizeAdminRequest.mockResolvedValue({ ok: false, status: 401 })
    const response = await POST(
      new Request('http://localhost/api/email/weekly-summary/user-1', {
        method: 'POST',
        headers: { authorization: 'Bearer cron-secret' },
      }),
      { params: Promise.resolve({ userid: 'user-1' }) },
    )
    expect(response.status).toBe(401)
    expect(buildWeeklyRecapEmail).not.toHaveBeenCalled()
  })
})
