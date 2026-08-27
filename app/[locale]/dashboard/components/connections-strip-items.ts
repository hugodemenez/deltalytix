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

export function isStandaloneAccount(account: {
  connectionId: string | null
}): boolean {
  return account.connectionId == null
}

export function accountDisplayName(account: {
  propfirm?: string | null
}): string | null {
  const name = account.propfirm?.trim()
  return name || null
}

export function isMaskedAccount(
  account: { groupId: string | null | undefined },
  hiddenGroupId: string | null | undefined
): boolean {
  return Boolean(hiddenGroupId && account.groupId === hiddenGroupId)
}

export function mapConnectionsAccounts(
  data: ConnectionsPageData,
  mapper: (account: ConnectionsPageAccount) => ConnectionsPageAccount
): ConnectionsPageData {
  return {
    connections: data.connections.map((connection) => ({
      ...connection,
      accounts: connection.accounts.map(mapper),
    })),
    standaloneAccounts: data.standaloneAccounts.map(mapper),
  }
}

export function removeConnectionsAccount(
  data: ConnectionsPageData,
  accountId: string
): ConnectionsPageData {
  return {
    connections: data.connections.map((connection) => ({
      ...connection,
      accounts: connection.accounts.filter((account) => account.id !== accountId),
    })),
    standaloneAccounts: data.standaloneAccounts.filter(
      (account) => account.id !== accountId
    ),
  }
}

/**
 * Inverse of an optimistic `moveAccountsToGroup`: restore `groupId` on the
 * account and put it back in the previous group (or no group).
 */
export function restoreMovedAccountGroup<
  TAccount extends { id: string; groupId: string | null },
  TGroup extends { id: string; accounts: Array<{ id: string }> },
>(
  accounts: TAccount[],
  groups: TGroup[],
  accountId: string,
  previousGroupId: string | null
): { accounts: TAccount[]; groups: TGroup[] } {
  const current = accounts.find((account) => account.id === accountId)
  if (!current) {
    return { accounts, groups }
  }
  const restored = { ...current, groupId: previousGroupId }
  return {
    accounts: accounts.map((account) =>
      account.id === accountId ? restored : account
    ),
    groups: groups.map((group) => {
      const remaining = group.accounts.filter(
        (account) => account.id !== accountId
      )
      if (previousGroupId && group.id === previousGroupId) {
        return {
          ...group,
          accounts: [...remaining, restored as TGroup['accounts'][number]],
        }
      }
      return { ...group, accounts: remaining }
    }),
  }
}

/** Chip meta is an account count, never an account number. */
export function chipAccountCountLabel(
  count: number,
  t: (key: 'connections.accountCount.one' | 'connections.accountCount.other', params: { count: number }) => string,
  options?: { numericOnly?: boolean }
): string | null {
  if (count <= 1) return null
  if (options?.numericOnly) return String(count)
  return t('connections.accountCount.other', { count })
}
