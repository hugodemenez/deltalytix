import { Suspense } from 'react'
import { ConnectionsPageClient } from './components/connections-page-client'
import { getConnectionsPageDataCached } from './data'

export default async function ConnectionsPage() {
  const initialData = await getConnectionsPageDataCached()

  return (
    <Suspense fallback={null}>
      <ConnectionsPageClient initialData={initialData} />
    </Suspense>
  )
}
