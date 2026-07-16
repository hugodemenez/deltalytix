'use server'

import { getUserId } from '@/server/auth'
import { prisma } from '@/lib/prisma'
import { toConnectionView } from '@/lib/connection-view'

export type ConnectionService = 'rithmic' | 'tradovate' | 'dxfeed' | 'thor' | 'etp'

export type ConnectionsPageAccount = {
  id: string
  number: string
  propfirm: string
  connectionId: string | null
  createdAt: Date
  tradeCount: number
}

export type ConnectionsPageConnection = ReturnType<typeof toConnectionView> & {
  accounts: ConnectionsPageAccount[]
}

export type ConnectionsPageData = {
  connections: ConnectionsPageConnection[]
  standaloneAccounts: ConnectionsPageAccount[]
}

export async function getConnectionsPageData(): Promise<ConnectionsPageData> {
  const userId = await getUserId()

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
    }),
  ])

  const countByNumber = new Map(
    tradeCounts.map((row) => [row.accountNumber, row._count._all])
  )

  const mappedAccounts: ConnectionsPageAccount[] = accounts.map((account) => ({
    ...account,
    tradeCount: countByNumber.get(account.number) ?? 0,
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
    connections: connections.map((connection) => ({
      ...toConnectionView(connection),
      accounts: accountsByConnection.get(connection.id) ?? [],
    })),
    standaloneAccounts,
  }
}
