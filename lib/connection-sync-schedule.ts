/**
 * Scheduling maths for automatic connection syncs.
 *
 * A connection carries at most one schedule:
 * - `syncIntervalMinutes` set → recurring, every N minutes.
 * - otherwise `dailySyncTime` set → once a day at that time-of-day
 *   (see `daily-sync-schedule.ts`).
 * - neither → manual only.
 *
 * The interval wins when both are present so switching to a recurring cadence
 * can keep the user's saved time-of-day for when they switch back.
 */

import { isDailySyncDue } from './daily-sync-schedule'

/**
 * Cadences offered in the UI, in minutes. Every value divides a day evenly, so
 * occurrences land on clean clock times (see `lastIntervalOccurrence`).
 * Anything outside this list is rejected before it reaches the database.
 */
export const SYNC_INTERVAL_OPTIONS = [5, 15, 30, 60, 240, 720] as const

export type SyncIntervalMinutes = (typeof SYNC_INTERVAL_OPTIONS)[number]

export function isSupportedSyncInterval(
  value: unknown,
): value is SyncIntervalMinutes {
  return (
    typeof value === 'number' &&
    (SYNC_INTERVAL_OPTIONS as readonly number[]).includes(value)
  )
}

/**
 * Cron ticks are not perfectly punctual. A tick that fires a few seconds early
 * would otherwise miss its occurrence and push the sync a whole interval out,
 * turning "every 5 minutes" into every 10.
 */
export const TICK_TOLERANCE_MS = 60_000

const MINUTE_MS = 60_000

/**
 * Most recent occurrence of a recurring schedule.
 *
 * Occurrences sit on a fixed grid anchored to the UTC epoch — 00:00, 04:00,
 * 08:00… for a 4h cadence — rather than on `lastSyncedAt + interval`. The grid
 * keeps the schedule drift-free whatever the cron cadence, and bounds a broken
 * connection to one retry per interval: a failed sync leaves `lastSyncedAt`
 * untouched, but the occurrence it is compared against only moves once per
 * interval.
 */
export function lastIntervalOccurrence(
  intervalMinutes: number,
  now: Date,
  toleranceMs: number = TICK_TOLERANCE_MS,
): Date {
  const intervalMs = intervalMinutes * MINUTE_MS
  return new Date(
    Math.floor((now.getTime() + toleranceMs) / intervalMs) * intervalMs,
  )
}

/** First occurrence strictly after `now` — what the UI counts down to. */
export function nextIntervalOccurrence(
  intervalMinutes: number,
  now: Date,
): Date {
  const intervalMs = intervalMinutes * MINUTE_MS
  return new Date(
    (Math.floor(now.getTime() / intervalMs) + 1) * intervalMs,
  )
}

/**
 * A recurring sync is due when its latest occurrence has passed and no sync
 * (scheduled or manual) has landed since. Anchoring on `lastSyncedAt` makes the
 * job idempotent: it fires once per occurrence however often the cron ticks.
 */
export function isIntervalSyncDue(
  intervalMinutes: number | null | undefined,
  lastSyncedAt: Date,
  now: Date,
  toleranceMs: number = TICK_TOLERANCE_MS,
): boolean {
  if (!intervalMinutes || intervalMinutes <= 0) return false
  return (
    lastSyncedAt.getTime() <
    lastIntervalOccurrence(intervalMinutes, now, toleranceMs).getTime()
  )
}

export type ConnectionSyncSchedule = {
  syncIntervalMinutes: number | null
  dailySyncTime: Date | null
}

export type SyncScheduleMode = 'interval' | 'daily' | 'off'

export function syncScheduleMode(
  schedule: ConnectionSyncSchedule,
): SyncScheduleMode {
  if (schedule.syncIntervalMinutes && schedule.syncIntervalMinutes > 0) {
    return 'interval'
  }
  if (schedule.dailySyncTime) return 'daily'
  return 'off'
}

/** Whichever schedule the connection carries, is it due right now? */
export function isConnectionSyncDue(
  schedule: ConnectionSyncSchedule,
  lastSyncedAt: Date,
  now: Date,
): boolean {
  switch (syncScheduleMode(schedule)) {
    case 'interval':
      return isIntervalSyncDue(schedule.syncIntervalMinutes, lastSyncedAt, now)
    case 'daily':
      return isDailySyncDue(schedule.dailySyncTime, lastSyncedAt, now)
    case 'off':
      return false
  }
}
