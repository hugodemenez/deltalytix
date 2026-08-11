'use server'

import { getUserId } from '@/server/auth'
import { prisma } from '@/lib/prisma'
import { isSupportedSyncInterval } from '@/lib/connection-sync-schedule'
import {
  getConnectionsPageDataFresh,
  invalidateConnectionsPageCache,
} from './data'
import { supportsDailySync } from './daily-sync-services'
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
 * How a connection should sync automatically.
 * - `interval`: every N minutes, N being one of `SYNC_INTERVAL_OPTIONS`.
 * - `daily`: once a day. `utcTimeString` is an ISO timestamp whose hours/minutes
 *   carry the preferred time of day (the date part is ignored).
 * - `off`: manual syncs only.
 */
export type ConnectionSyncScheduleInput =
  | { mode: 'off' }
  | { mode: 'interval'; intervalMinutes: number }
  | { mode: 'daily'; utcTimeString: string }

export async function updateConnectionSyncScheduleAction(
  connectionId: string,
  schedule: ConnectionSyncScheduleInput
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

  if (!supportsDailySync(existing.service)) {
    return { error: 'UNSUPPORTED_SERVICE' }
  }

  // Only one of the two columns ever describes the live schedule, so the unused
  // one is cleared: a leftover interval would otherwise outrank a daily time.
  let data: {
    syncIntervalMinutes: number | null
    dailySyncTime?: Date | null
  }
  if (schedule.mode === 'interval') {
    if (!isSupportedSyncInterval(schedule.intervalMinutes)) {
      return { error: 'UNSUPPORTED_SYNC_INTERVAL' }
    }
    // The saved time of day is kept so switching back to daily restores it.
    data = { syncIntervalMinutes: schedule.intervalMinutes }
  } else if (schedule.mode === 'daily') {
    const dailySyncTime = new Date(schedule.utcTimeString)
    if (Number.isNaN(dailySyncTime.getTime())) {
      return { error: 'INVALID_SYNC_TIME' }
    }
    data = { syncIntervalMinutes: null, dailySyncTime }
  } else {
    data = { syncIntervalMinutes: null, dailySyncTime: null }
  }

  await prisma.connection.update({
    where: { id: connectionId },
    data,
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
  return updateConnectionSyncScheduleAction(
    connectionId,
    utcTimeString ? { mode: 'daily', utcTimeString } : { mode: 'off' }
  )
}
