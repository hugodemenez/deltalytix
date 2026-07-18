import { cacheLife, cacheTag } from 'next/cache'
import { loadConnectionsPageDataForUser } from '../data'
import { ConnectionsPageClient } from './connections-page-client'

function connectionsCacheTag(userId: string) {
  return `connections-${userId}`
}

/**
 * Per-user cached RSC UI for Connections.
 *
 * Instant Navigations distinction:
 * - Suspense alone (Stream) → skeleton every navigation until data resolves
 * - `'use cache'` (Cache) → warm entries reuse this UI across requests/refreshes
 *
 * `userId` is passed in from outside so cookies/headers stay out of the cache scope.
 */
export async function CachedConnectionsPage({ userId }: { userId: string }) {
  'use cache'
  cacheTag(connectionsCacheTag(userId))
  cacheLife('minutes')

  const initialData = await loadConnectionsPageDataForUser(userId)
  return <ConnectionsPageClient initialData={initialData} />
}
