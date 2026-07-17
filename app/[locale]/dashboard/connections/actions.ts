'use server'

import { getUserId } from '@/server/auth'
import { prisma } from '@/lib/prisma'
import {
  getConnectionsPageDataFresh,
  invalidateConnectionsPageCache,
} from './data'
import type { ConnectionsPageData } from './types'

export type {
  ConnectionService,
  ConnectionStatus,
  ConnectionsPageAccount,
  ConnectionsPageConnection,
  ConnectionsPageData,
} from './types'

export async function getConnectionsPageData(): Promise<ConnectionsPageData> {
  return getConnectionsPageDataFresh()
}

export async function deleteConnectionAction(
  connectionId: string
): Promise<{ success: true } | { error: string }> {
  const userId = await getUserId()
  if (!connectionId) {
    return { error: 'MISSING_CONNECTION_ID' }
  }

  const existing = await prisma.connection.findFirst({
    where: { id: connectionId, userId },
    select: { id: true },
  })
  if (!existing) {
    return { error: 'NOT_FOUND' }
  }

  await prisma.connection.delete({
    where: { id: connectionId },
  })
  await invalidateConnectionsPageCache(userId)

  return { success: true }
}

/**
 * Update daily sync time for a connection.
 * `utcTimeString` should be an ISO timestamp whose local hours/minutes represent the preferred sync time.
 */
export async function updateConnectionDailySyncTimeAction(
  connectionId: string,
  utcTimeString: string | null
): Promise<{ success: true } | { error: string }> {
  const userId = await getUserId()
  if (!connectionId) {
    return { error: 'MISSING_CONNECTION_ID' }
  }

  const existing = await prisma.connection.findFirst({
    where: { id: connectionId, userId },
    select: { id: true, service: true },
  })
  if (!existing) {
    return { error: 'NOT_FOUND' }
  }

  if (existing.service !== 'tradovate' && existing.service !== 'dxfeed') {
    return { error: 'UNSUPPORTED_SERVICE' }
  }

  await prisma.connection.update({
    where: { id: connectionId },
    data: {
      dailySyncTime: utcTimeString ? new Date(utcTimeString) : null,
    },
  })
  await invalidateConnectionsPageCache(userId)

  return { success: true }
}
