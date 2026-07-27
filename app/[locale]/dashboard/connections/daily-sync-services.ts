/**
 * Services whose connections can carry a `dailySyncTime`.
 *
 * A service belongs here only once two things exist: the schedule dialog on the
 * connections page can save it, and `/api/cron/daily-sync` knows how to run an
 * unattended sync for it. Adding a service to this list without the cron side
 * ships a time picker that never fires.
 */
export const DAILY_SYNC_SERVICES = [
  'tradovate',
  'dxfeed',
  'rithmic-protocol',
] as const

export type DailySyncService = (typeof DAILY_SYNC_SERVICES)[number]

export function supportsDailySync(service: string): service is DailySyncService {
  return (DAILY_SYNC_SERVICES as readonly string[]).includes(service)
}
