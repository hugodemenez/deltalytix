import { getCachedConnectionsPageData } from '../data'
import { ConnectionsPageClient } from './connections-page-client'

/**
 * Connections list entry: resolve tagged cached *data*, then render the client
 * list outside the `'use cache'` boundary.
 *
 * Caching only the data (not the Client Component) keeps Instant Navigations
 * warm-cache benefits while ensuring server-action IDs on the client stay bound
 * to the current deployment / HMR generation.
 *
 * `userId` is passed in from outside so cookies/headers stay out of the cache scope.
 */
export async function CachedConnectionsPage({ userId }: { userId: string }) {
  const initialData = await getCachedConnectionsPageData(userId)
  return <ConnectionsPageClient initialData={initialData} />
}
