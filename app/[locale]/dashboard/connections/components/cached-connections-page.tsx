import { cacheLife, cacheTag } from 'next/cache'
import { loadConnectionsPageDataForUser } from '../data'
import { ConnectionsPageClient } from './connections-page-client'

function connectionsCacheTag(userId: string) {
  return `connections-${userId}`
}

/**
 * Per-user cached Connections list UI (chrome lives outside Suspense).
 *
 * Instant Navigations:
 * - Cold cache → list Suspense skeleton under the instant chrome
 * - Warm `'use cache'` → list UI reused across requests (no skeleton)
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
