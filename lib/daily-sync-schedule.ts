/**
 * Scheduling maths for the daily connection sync cron.
 *
 * `Connection.dailySyncTime` is stored as a full timestamp, but only its UTC
 * hours/minutes carry meaning — the date part is whatever day the user happened
 * to save it on.
 */

/**
 * How long after a missed occurrence we still catch up. Covers deploys and cron
 * hiccups without replaying a schedule the user set hours ago.
 */
export const CATCH_UP_WINDOW_MS = 6 * 60 * 60 * 1000

/**
 * Time-of-day a brand-new schedulable connection starts with.
 *
 * 22:00 UTC is the existing "After Market Close" preset in the sync schedule
 * picker (18:00 in New York during daylight time, 17:00 during standard time).
 * Only the UTC hours and minutes are read by the daily cron; the date is a
 * fixed anchor so the stored value does not depend on when the row was created.
 */
export const DEFAULT_DAILY_SYNC_UTC_HOUR = 22
export const DEFAULT_DAILY_SYNC_UTC_MINUTE = 0

export function defaultDailySyncTime(): Date {
  return new Date(
    Date.UTC(
      1970,
      0,
      1,
      DEFAULT_DAILY_SYNC_UTC_HOUR,
      DEFAULT_DAILY_SYNC_UTC_MINUTE,
      0,
      0,
    ),
  )
}

/** Most recent moment the configured time-of-day elapsed, in UTC. */
export function lastOccurrenceOf(dailySyncTime: Date, now: Date): Date {
  const occurrence = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      dailySyncTime.getUTCHours(),
      dailySyncTime.getUTCMinutes(),
      0,
      0,
    ),
  )
  if (occurrence.getTime() > now.getTime()) {
    occurrence.setUTCDate(occurrence.getUTCDate() - 1)
  }
  return occurrence
}

/**
 * A connection is due when its latest scheduled occurrence has passed, is still
 * within the catch-up window, and no sync (manual or scheduled) has landed since.
 *
 * Anchoring on `lastSyncedAt` rather than a fixed ± window around the configured
 * time makes the job idempotent: it fires exactly once per occurrence no matter
 * how often the cron ticks, and a missed tick is retried instead of skipped.
 */
export function isDailySyncDue(
  dailySyncTime: Date | null,
  lastSyncedAt: Date,
  now: Date,
  catchUpWindowMs: number = CATCH_UP_WINDOW_MS,
): boolean {
  if (!dailySyncTime) return false

  const occurrence = lastOccurrenceOf(dailySyncTime, now)
  if (now.getTime() - occurrence.getTime() > catchUpWindowMs) return false

  return lastSyncedAt.getTime() < occurrence.getTime()
}
