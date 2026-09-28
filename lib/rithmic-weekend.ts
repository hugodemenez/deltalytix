import { isRithmicConnectionService } from '@/lib/rithmic-api'

/**
 * Saturday or Sunday in the caller's local timezone.
 * Import and Connections both use the browser local day on the client.
 */
export function isLocalWeekend(now: Date = new Date()): boolean {
  const day = now.getDay()
  return day === 0 || day === 6
}

/**
 * Rithmic and Rithmic Protocol servers are down on local weekends.
 * Manual sync then is expected to fail — treat it as downtime, not a broken connection.
 */
export function isRithmicWeekendDowntime(
  service: string | null | undefined,
  now: Date = new Date()
): boolean {
  return isRithmicConnectionService(service) && isLocalWeekend(now)
}

/** Drop Rithmic connections from a Sync-all batch when it is the weekend. */
export function excludeWeekendBlockedConnections<
  T extends { service: string },
>(connections: T[], now: Date = new Date()): T[] {
  return connections.filter(
    (connection) => !isRithmicWeekendDowntime(connection.service, now)
  )
}

export const RITHMIC_WEEKEND_WARNING_KEY =
  'import.type.rithmicWeekendWarning' as const
export const RITHMIC_WEEKEND_WARNING_SHORT_KEY =
  'import.type.rithmicWeekendWarningShort' as const

/** Sync contexts return this instead of hitting Rithmic on a local weekend. */
export const RITHMIC_WEEKEND_UNAVAILABLE = 'WEEKEND_UNAVAILABLE'
