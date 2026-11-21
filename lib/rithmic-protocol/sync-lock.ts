import 'server-only'
import { Client } from 'pg'

const LOCK_NAMESPACE = 'rithmic-protocol-sync'
const DEFAULT_LOCK_WAIT_MS = 15_000
const LOCK_RETRY_MS = 200
const CONNECT_TIMEOUT_MS = 10_000

export type ProtocolSyncLockCode =
  | 'LOCK_UNAVAILABLE'
  | 'LOCK_TIMEOUT'
  | 'LOCK_LOST'

export class ProtocolSyncLockError extends Error {
  constructor(
    public readonly code: ProtocolSyncLockCode,
    message: string,
  ) {
    super(message)
    this.name = 'ProtocolSyncLockError'
  }
}

export type ProtocolSyncLockGuard = {
  throwIfLost: () => void
}

/**
 * Session advisory locks cannot be held through a transaction-mode
 * pooler. Refuse `pgbouncer=true` and port 6543 (Supabase transaction
 * mode). Allow session mode, including `*.pooler.supabase.com:5432` and
 * direct `db.<ref>:5432`. Prisma queries still go through `DATABASE_URL`.
 */
export function isTransactionPoolerUrl(url: string): boolean {
  const lower = url.toLowerCase()
  if (/[?&]pgbouncer=true(?:&|$)/.test(lower) || lower.includes('pgbouncer=true')) {
    return true
  }
  try {
    const parsed = new URL(url.replace(/^postgres(?:ql)?:/i, 'http:'))
    const port = parsed.port || '5432'
    if (port === '6543') return true
  } catch {
    if (/:6543(?:[/?]|$)/.test(lower)) return true
  }
  return false
}

export function resolveProtocolLockConnectionString(
  env: NodeJS.Dict<string | undefined> = process.env,
): string {
  const direct = env.DIRECT_URL?.trim()
  const database = env.DATABASE_URL?.trim()
  if (direct && !isTransactionPoolerUrl(direct)) return direct
  if (database && !isTransactionPoolerUrl(database)) return database
  throw new ProtocolSyncLockError(
    'LOCK_UNAVAILABLE',
    'Protocol sync lock requires a session-capable Postgres URL. Set DIRECT_URL to session-mode Postgres (port 5432, including *.pooler.supabase.com:5432). Transaction-mode poolers (port 6543 / pgbouncer=true) cannot hold session advisory locks.',
  )
}

export function protocolAccountLockKeys(
  userId: string,
  accountNumbers: string[],
): string[] {
  const unique = [
    ...new Set(
      accountNumbers
        .map((accountNumber) => accountNumber.trim())
        .filter((accountNumber) => accountNumber.length > 0),
    ),
  ].sort()
  const trimmedUser = userId.trim()
  if (!trimmedUser || unique.length === 0) return []
  return unique.map((accountNumber) => `${trimmedUser}:${accountNumber}`)
}

export function protocolLockWaitMs(
  env: NodeJS.Dict<string | undefined> = process.env,
): number {
  const raw = Number(env.PROTOCOL_SYNC_LOCK_TIMEOUT_MS ?? DEFAULT_LOCK_WAIT_MS)
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_LOCK_WAIT_MS
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function releaseKeys(client: Client, keys: string[]): Promise<void> {
  for (const key of keys) {
    try {
      await client.query(
        'SELECT pg_advisory_unlock(hashtext($1), hashtext($2))',
        [LOCK_NAMESPACE, key],
      )
    } catch (error) {
      console.error('[protocol-sync-lock] unlock failed', error)
    }
  }
}

/**
 * Serialize Protocol fetch+write for one trading account across admin
 * rebuilds and ordinary syncs.
 *
 * Keys are `userId:accountNumber` so a missing connection id cannot skip
 * the lock. Session advisory locks are taken on a dedicated `pg` client
 * (DIRECT_URL, not the Prisma pooler) and held for the whole callback,
 * including the Lucid fetch.
 */
export async function withProtocolSyncLock<T>(
  keys: string[],
  fn: (guard: ProtocolSyncLockGuard) => Promise<T>,
): Promise<T> {
  const uniqueKeys = [...new Set(keys.filter((key) => key.trim().length > 0))]
  if (uniqueKeys.length === 0) {
    throw new ProtocolSyncLockError(
      'LOCK_UNAVAILABLE',
      'Protocol sync lock requires at least one account key (userId + accountNumber).',
    )
  }

  const connectionString = resolveProtocolLockConnectionString()
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
  })

  let lost = false
  let lostError: Error | undefined
  const guard: ProtocolSyncLockGuard = {
    throwIfLost() {
      if (!lost) return
      throw new ProtocolSyncLockError(
        'LOCK_LOST',
        lostError?.message ?? 'Protocol sync lock connection was lost',
      )
    },
  }

  const onError = (error: Error) => {
    lost = true
    lostError = error
  }
  client.on('error', onError)

  const acquired: string[] = []
  try {
    await client.connect()
    await client.query(`SET lock_timeout TO '${protocolLockWaitMs()}ms'`)
    const deadline = Date.now() + protocolLockWaitMs()
    for (const key of uniqueKeys) {
      while (true) {
        guard.throwIfLost()
        const result = await client.query<{ locked: boolean }>(
          'SELECT pg_try_advisory_lock(hashtext($1), hashtext($2)) AS locked',
          [LOCK_NAMESPACE, key],
        )
        if (result.rows[0]?.locked) {
          acquired.push(key)
          break
        }
        if (Date.now() >= deadline) {
          throw new ProtocolSyncLockError(
            'LOCK_TIMEOUT',
            `Timed out waiting for protocol sync lock on ${uniqueKeys.join(',')}`,
          )
        }
        await sleep(LOCK_RETRY_MS)
      }
    }
    guard.throwIfLost()
    return await fn(guard)
  } finally {
    await releaseKeys(client, acquired)
    try {
      await client.end()
    } catch (error) {
      console.error('[protocol-sync-lock] client end failed', error)
    }
    client.removeListener('error', onError)
  }
}
