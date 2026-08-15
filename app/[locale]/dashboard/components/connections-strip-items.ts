import type {
  ConnectionsPageAccount,
  ConnectionsPageConnection,
  ConnectionsPageData,
} from '@/app/[locale]/dashboard/connections/types'

export type StripItem =
  | {
      kind: 'connection'
      id: string
      displayName: string
      status: 'connected' | 'error' | 'offline'
      service: string
      accounts: ConnectionsPageAccount[]
    }
  | {
      kind: 'standalone'
      id: string
      displayName: string
      status: 'offline'
      service: string | null
      accounts: ConnectionsPageAccount[]
    }

/**
 * Strip chips are connections only. Every account without a broker link
 * belongs on one Standalone chip — never a chip per account number or propfirm.
 */
export function buildStripItems(
  data: ConnectionsPageData | null,
  standaloneLabel: string
): StripItem[] {
  if (!data) return []

  const connectionItems: StripItem[] = data.connections.map(
    (connection: ConnectionsPageConnection) => ({
      kind: 'connection' as const,
      id: connection.id,
      displayName: connection.displayName,
      status: connection.status,
      service: connection.service,
      accounts: connection.accounts,
    })
  )

  if (data.standaloneAccounts.length === 0) {
    return connectionItems
  }

  return [
    ...connectionItems,
    {
      kind: 'standalone',
      id: 'standalone',
      displayName: standaloneLabel,
      status: 'offline',
      service: null,
      accounts: data.standaloneAccounts,
    },
  ]
}

/** Chip meta is an account count, never an account number. */
export function chipAccountCountLabel(
  count: number,
  t: (key: 'connections.accountCount.one' | 'connections.accountCount.other', params: { count: number }) => string
): string | null {
  if (count <= 1) return null
  return t('connections.accountCount.other', { count })
}
