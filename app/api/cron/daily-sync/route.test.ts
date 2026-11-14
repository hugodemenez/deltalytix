import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('@/lib/connection-token-crypto', () => ({
  decryptConnectionToken: vi.fn(),
}))
vi.mock('@/lib/connection-sync-schedule', () => ({
  isConnectionSyncDue: vi.fn(),
}))
vi.mock('@/app/[locale]/dashboard/components/import/dxfeed/sync/actions', () => ({
  getDxFeedTrades: vi.fn(),
}))
vi.mock(
  '@/app/[locale]/dashboard/components/import/rithmic-protocol/sync/actions',
  () => ({ getRithmicProtocolTrades: vi.fn() }),
)
vi.mock('@/app/[locale]/dashboard/components/import/ibkr/sync/actions', () => ({
  syncIbkrAccount: vi.fn(),
}))
vi.mock(
  '@/app/[locale]/dashboard/components/import/tradovate/sync/actions',
  () => ({ getTradovateTrades: vi.fn() }),
)
vi.mock('@/app/[locale]/dashboard/components/import/ig/sync/actions', () => ({
  getIgTrades: vi.fn(),
}))
vi.mock('@/app/[locale]/dashboard/connections/data', () => ({
  invalidateConnectionsPageCache: vi.fn(),
}))
vi.mock('@/lib/api/server-actor', () => ({ serverActor: vi.fn() }))
vi.mock('@/lib/tradovate/api-hosts', () => ({
  parseTradovateApiHosts: vi.fn(),
}))

import { POST } from './route'

describe('POST /api/cron/daily-sync', () => {
  it('rejects a non-scheduler call, including the old CRON_SECRET bearer', async () => {
    const response = await POST(
      new Request('http://localhost/api/cron/daily-sync', {
        method: 'POST',
        headers: { authorization: 'Bearer cron-secret' },
      }),
    )
    expect(response.status).toBe(400)
  })
})
