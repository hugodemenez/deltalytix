import 'server-only'
import { Client } from 'pg'

const LOCK_NAMESPACE = 'rithmic-protocol-sync'

/**
 * Serialize Protocol fetch+write for one Connection across admin rebuilds
 * and ordinary syncs.
 *
 * Session advisory locks are taken on a dedicated `pg` client (not the
 * Prisma pool) so the lock is held for the whole callback, including the
 * Lucid fetch. Prisma queries on other connections still see committed data;
 * they wait only if they request the same lock keys.
 */
export async function withProtocolSyncLock<T>(
  connectionId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for protocol sync locking')
  }
  const client = new Client({ connectionString })
  await client.connect()
  try {
    await client.query('SELECT pg_advisory_lock(hashtext($1), hashtext($2))', [
      LOCK_NAMESPACE,
      connectionId,
    ])
    try {
      return await fn()
    } finally {
      await client.query(
        'SELECT pg_advisory_unlock(hashtext($1), hashtext($2))',
        [LOCK_NAMESPACE, connectionId],
      )
    }
  } finally {
    await client.end()
  }
}
