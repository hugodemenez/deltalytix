import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { query, connect, end, on, removeListener, Client } = vi.hoisted(() => {
  const query = vi.fn()
  const connect = vi.fn()
  const end = vi.fn()
  const on = vi.fn()
  const removeListener = vi.fn()
  class Client {
    query = query
    connect = connect
    end = end
    on = on
    removeListener = removeListener
  }
  return { query, connect, end, on, removeListener, Client }
})

vi.mock('pg', () => ({ Client }))

import {
  ProtocolSyncLockError,
  isTransactionPoolerUrl,
  protocolAccountLockKeys,
  resolveProtocolLockConnectionString,
  withProtocolSyncLock,
} from './sync-lock'

describe('protocol sync lock URLs and keys', () => {
  it('refuses transaction-mode poolers and allows session-mode 5432', () => {
    expect(
      isTransactionPoolerUrl(
        'postgresql://user:pass@host:6543/postgres?pgbouncer=true',
      ),
    ).toBe(true)
    expect(
      isTransactionPoolerUrl(
        'postgresql://user:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres',
      ),
    ).toBe(true)
    expect(
      isTransactionPoolerUrl(
        'postgresql://user:pass@aws-0-us-east-1.pooler.supabase.com:5432/postgres',
      ),
    ).toBe(false)
    expect(
      isTransactionPoolerUrl('postgresql://user:pass@db.supabase.co:5432/postgres'),
    ).toBe(false)
    expect(
      isTransactionPoolerUrl(
        'postgresql://user:pass@aws-0-us-east-1.pooler.supabase.com:5432/postgres?pgbouncer=true',
      ),
    ).toBe(true)
  })

  it('prefers session-mode DIRECT_URL including the 5432 pooler', () => {
    expect(
      resolveProtocolLockConnectionString({
        DATABASE_URL: 'postgresql://user:pass@host:6543/postgres?pgbouncer=true',
        DIRECT_URL:
          'postgresql://user:pass@aws-0-us-east-1.pooler.supabase.com:5432/postgres',
      }),
    ).toBe(
      'postgresql://user:pass@aws-0-us-east-1.pooler.supabase.com:5432/postgres',
    )
    expect(
      resolveProtocolLockConnectionString({
        DATABASE_URL: 'postgresql://user:pass@host:6543/postgres?pgbouncer=true',
        DIRECT_URL: 'postgresql://user:pass@db.example:5432/postgres',
      }),
    ).toBe('postgresql://user:pass@db.example:5432/postgres')
    expect(() =>
      resolveProtocolLockConnectionString({
        DATABASE_URL: 'postgresql://user:pass@host:6543/postgres?pgbouncer=true',
      }),
    ).toThrow(ProtocolSyncLockError)
  })

  it('builds sorted account keys and refuses an empty set', () => {
    expect(protocolAccountLockKeys('user-1', ['b', 'a', 'a', ' '])).toEqual([
      'user-1:a',
      'user-1:b',
    ])
    expect(protocolAccountLockKeys('user-1', [])).toEqual([])
  })
})

describe('withProtocolSyncLock', () => {
  const env = { ...process.env }

  beforeEach(() => {
    query.mockReset()
    connect.mockReset().mockResolvedValue(undefined)
    end.mockReset().mockResolvedValue(undefined)
    on.mockReset()
    removeListener.mockReset()
    process.env.DIRECT_URL = 'postgresql://user:pass@localhost:5432/deltalytix_dev'
    process.env.DATABASE_URL =
      'postgresql://user:pass@localhost:6543/deltalytix_dev?pgbouncer=true'
    query.mockImplementation(async (sql: string) => {
      if (String(sql).includes('pg_try_advisory_lock')) {
        return { rows: [{ locked: true }] }
      }
      return { rows: [] }
    })
  })

  afterEach(() => {
    process.env = { ...env }
  })

  it('refuses to fail open without lock keys', async () => {
    await expect(withProtocolSyncLock([], async () => 'ok')).rejects.toMatchObject({
      code: 'LOCK_UNAVAILABLE',
    })
    expect(connect).not.toHaveBeenCalled()
  })

  it('times out when the advisory lock is not acquired', async () => {
    process.env.PROTOCOL_SYNC_LOCK_TIMEOUT_MS = '5'
    let now = 1_000_000
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => now)
    query.mockImplementation(async (sql: string) => {
      if (String(sql).includes('pg_try_advisory_lock')) {
        now += 20
        return { rows: [{ locked: false }] }
      }
      return { rows: [] }
    })
    await expect(
      withProtocolSyncLock(['user-1:acct'], async () => 'ok'),
    ).rejects.toMatchObject({ code: 'LOCK_TIMEOUT' })
    nowSpy.mockRestore()
  })

  it('does not fail the callback when unlock/end throw', async () => {
    query.mockImplementation(async (sql: string) => {
      if (String(sql).includes('pg_try_advisory_lock')) {
        return { rows: [{ locked: true }] }
      }
      if (String(sql).includes('pg_advisory_unlock')) {
        throw new Error('unlock failed')
      }
      return { rows: [] }
    })
    end.mockRejectedValueOnce(new Error('end failed'))
    await expect(
      withProtocolSyncLock(['user-1:acct'], async () => 'ok'),
    ).resolves.toBe('ok')
  })

  it('surfaces a lost lock connection', async () => {
    let errorHandler: ((error: Error) => void) | undefined
    on.mockImplementation((event: string, handler: (error: Error) => void) => {
      if (event === 'error') errorHandler = handler
    })
    await expect(
      withProtocolSyncLock(['user-1:acct'], async (guard) => {
        errorHandler?.(new Error('socket hang up'))
        guard.throwIfLost()
        return 'ok'
      }),
    ).rejects.toMatchObject({ code: 'LOCK_LOST' })
  })
})
