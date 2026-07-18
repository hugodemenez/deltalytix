import { ConnectionsPageChrome } from './components/connections-page-chrome'
import { ConnectionsListSkeleton } from './components/connections-page-skeleton'

export default function ConnectionsLoading() {
  return (
    <ConnectionsPageChrome>
      <ConnectionsListSkeleton />
    </ConnectionsPageChrome>
  )
}
