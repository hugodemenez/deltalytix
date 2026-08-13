/**
 * Services whose connections can carry a sync schedule — a recurring
 * `syncIntervalMinutes` cadence or a once-a-day `dailySyncTime`.
 *
 * A service belongs here only once two things exist: the schedule dialog on the
 * connections page can save it, and `/api/cron/daily-sync` knows how to run an
 * unattended sync for it. Adding a service to this list without the cron side
 * ships a schedule that never fires.
 */
export const DAILY_SYNC_SERVICES = [
  'tradovate',
  'dxfeed',
  'rithmic-protocol',
  'ibkr',
  'ig',
] as const

export type DailySyncService = (typeof DAILY_SYNC_SERVICES)[number]

export function supportsDailySync(service: string): service is DailySyncService {
  return (DAILY_SYNC_SERVICES as readonly string[]).includes(service)
}
