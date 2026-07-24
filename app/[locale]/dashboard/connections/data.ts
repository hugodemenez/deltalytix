import { cacheLife, cacheTag, updateTag } from 'next/cache'
import { getUserId } from '@/server/auth'
import { prisma } from '@/lib/prisma'
import { toConnectionView } from '@/lib/connection-view'
import { decryptConnectionToken } from '@/lib/connection-token-crypto'
import { getDxFeedPropFirm } from '@/lib/dxfeed-propfirms'
import type { Connection } from '@/prisma/generated/prisma/client'
import type {
  ConnectionsPageAccount,
  ConnectionsPageConnection,
  ConnectionsPageData,
} from './types'

function connectionsCacheTag(userId: string) {
  return `connections-${userId}`
}

function plaintextConnectionToken(token: string | null): string | null {
  if (!token) return null
  try {
    return decryptConnectionToken(token)
  } catch {
    return null
  }
}

function parseConnectionAuthError(token: string | null): string | null {
  const plaintext = plaintextConnectionToken(token)
  if (!plaintext) return null
  try {
    const parsed = JSON.parse(plaintext) as { authError?: string }
    return typeof parsed.authError === 'string' && parsed.authError.length > 0
      ? parsed.authError
      : null
  } catch {
    return null
  }
}

function deriveConnectionStatus(
  connection: Connection
): ConnectionsPageConnection['status'] {
  if (connection.service === 'rithmic') {
    return 'connected'
  }

  if (!connection.token || parseConnectionAuthError(connection.token)) {
    return 'error'
  }

  if (
    connection.tokenExpiresAt &&
    connection.tokenExpiresAt.getTime() <= Date.now()
  ) {
    return 'warning'
  }

  return 'connected'
}

function getDxFeedPropFirmName(token: string | null): string | null {
  const plaintext = plaintextConnectionToken(token)
  if (!plaintext) return null
  try {
    const parsed = JSON.parse(plaintext) as {
      propFirmId?: string
      propfirmName?: string
    }
    return (
      getDxFeedPropFirm(parsed.propFirmId)?.name ?? parsed.propfirmName ?? null
    )
  } catch {
    return null
  }
}

function isGenericTradovateLabel(externalId: string): boolean {
  const id = externalId.trim()
  if (!id) return true
  // Tradovate often returns "TDV" as organizationName for retail / no-propfirm accounts.
  if (id.toUpperCase() === 'TDV') return true
  if (id.toLowerCase().startsWith('tradovate-')) return true
  return false
}

function getConnectionDisplay(
  connection: Connection
): { displayName: string; loginLabel: string | null } {
  const externalId = connection.externalId
  if (connection.service === 'dxfeed') {
    const propFirmName = getDxFeedPropFirmName(connection.token)
    if (propFirmName) {
      // Prop firm name only — do not surface the login email in the row.
      return { displayName: propFirmName, loginLabel: null }
    }
  }
  if (connection.service === 'tradovate') {
    if (parseConnectionAuthError(connection.token)) {
      return { displayName: 'Tradovate', loginLabel: null }
    }
    // Prefer real prop-firm org names; fall back to "Tradovate" for generic API labels.
    if (isGenericTradovateLabel(externalId)) {
      return { displayName: 'Tradovate', loginLabel: null }
    }
    return { displayName: externalId, loginLabel: null }
  }
  return { displayName: externalId, loginLabel: null }
}

export async function loadConnectionsPageDataForUser(
  userId: string
): Promise<ConnectionsPageData> {
  const [connections, accounts, tradeCounts] = await Promise.all([
    prisma.connection.findMany({
      where: { userId },
      orderBy: [{ service: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.account.findMany({
      where: { userId },
      select: {
        id: true,
        number: true,
        propfirm: true,
        connectionId: true,
        createdAt: true,
      },
      orderBy: { number: 'asc' },
    }),
    prisma.trade.groupBy({
      by: ['accountNumber'],
      where: { userId },
      _count: { _all: true },
      _max: { entryDate: true },
    }),
  ])

  const countByNumber = new Map(
    tradeCounts.map((row) => [row.accountNumber, row._count._all])
  )
  // entryDate is an ISO string, so lexicographic max is the latest trade date.
  const lastTradeByNumber = new Map(
    tradeCounts.map((row) => [row.accountNumber, row._max.entryDate ?? null])
  )

  const mappedAccounts: ConnectionsPageAccount[] = accounts.map((account) => ({
    ...account,
    tradeCount: countByNumber.get(account.number) ?? 0,
    lastTradeDate: lastTradeByNumber.get(account.number) ?? null,
  }))

  const accountsByConnection = new Map<string, ConnectionsPageAccount[]>()
  const standaloneAccounts: ConnectionsPageAccount[] = []

  for (const account of mappedAccounts) {
    if (account.connectionId) {
      const list = accountsByConnection.get(account.connectionId) ?? []
      list.push(account)
      accountsByConnection.set(account.connectionId, list)
    } else {
      standaloneAccounts.push(account)
    }
  }

  return {
    connections: connections.map((connection) => {
      const { token: _token, ...safe } = toConnectionView(connection)
      const { displayName, loginLabel } = getConnectionDisplay(connection)
      return {
        ...safe,
        accounts: accountsByConnection.get(connection.id) ?? [],
        status: deriveConnectionStatus(connection),
        displayName,
        loginLabel,
        authError: parseConnectionAuthError(connection.token),
      }
    }),
    standaloneAccounts,
  }
}

/**
 * Cached per-user connections payload for RSC page loads.
 * `userId` is part of the cache key (passed from outside — cookies stay out of `use cache`).
 */
export async function getCachedConnectionsPageData(
  userId: string
): Promise<ConnectionsPageData> {
  'use cache'
  cacheTag(connectionsCacheTag(userId))
  cacheLife('minutes')
  return loadConnectionsPageDataForUser(userId)
}

/** Server page entry: resolve user, then read the tagged cache. */
export async function getConnectionsPageDataCached(): Promise<ConnectionsPageData> {
  const userId = await getUserId()
  return getCachedConnectionsPageData(userId)
}

/** Fresh read for client refreshes / after mutations. */
export async function getConnectionsPageDataFresh(): Promise<ConnectionsPageData> {
  const userId = await getUserId()
  return loadConnectionsPageDataForUser(userId)
}

export async function invalidateConnectionsPageCache(userId?: string) {
  const id = userId ?? (await getUserId())
  try {
    updateTag(connectionsCacheTag(id))
  } catch {
    // updateTag is only valid in some server contexts; ignore elsewhere
  }
}
