import { describe, expect, it } from 'vitest'
import {
  CATCH_UP_WINDOW_MS,
  isDailySyncDue,
  lastOccurrenceOf,
} from './daily-sync-schedule'

/** Only the UTC time-of-day matters; the date is whatever day the user saved on. */
function scheduleAt(hours: number, minutes = 0): Date {
  return new Date(Date.UTC(2020, 0, 1, hours, minutes, 0, 0))
}

const HOUR = 60 * 60 * 1000

describe('lastOccurrenceOf', () => {
  it('returns today when the time has already passed', () => {
    const now = new Date('2026-07-26T14:00:00.000Z')
    expect(lastOccurrenceOf(scheduleAt(9), now).toISOString()).toBe(
      '2026-07-26T09:00:00.000Z',
    )
  })

  it('rolls back to yesterday when the time is still ahead', () => {
    const now = new Date('2026-07-26T06:00:00.000Z')
    expect(lastOccurrenceOf(scheduleAt(9), now).toISOString()).toBe(
      '2026-07-25T09:00:00.000Z',
    )
  })

  it('ignores the date component of the stored timestamp', () => {
    const storedLongAgo = new Date('2023-02-11T22:30:00.000Z')
    const now = new Date('2026-07-26T23:00:00.000Z')
    expect(lastOccurrenceOf(storedLongAgo, now).toISOString()).toBe(
      '2026-07-26T22:30:00.000Z',
    )
  })

  it('rolls back across a month boundary', () => {
    const now = new Date('2026-08-01T01:00:00.000Z')
    expect(lastOccurrenceOf(scheduleAt(23), now).toISOString()).toBe(
      '2026-07-31T23:00:00.000Z',
    )
  })
})

describe('isDailySyncDue', () => {
  it('is never due without a configured time', () => {
    const now = new Date('2026-07-26T09:05:00.000Z')
    expect(isDailySyncDue(null, new Date('2026-07-25T00:00:00.000Z'), now)).toBe(
      false,
    )
  })

  it('fires once the scheduled time has passed', () => {
    const now = new Date('2026-07-26T09:05:00.000Z')
    const lastSynced = new Date('2026-07-25T09:02:00.000Z')
    expect(isDailySyncDue(scheduleAt(9), lastSynced, now)).toBe(true)
  })

  it('does not fire before the scheduled time', () => {
    const now = new Date('2026-07-26T08:55:00.000Z')
    const lastSynced = new Date('2026-07-25T09:02:00.000Z')
    expect(isDailySyncDue(scheduleAt(9), lastSynced, now)).toBe(false)
  })

  it('does not fire twice for the same occurrence', () => {
    const schedule = scheduleAt(9)
    const now = new Date('2026-07-26T09:05:00.000Z')
    const afterFirstRun = new Date('2026-07-26T09:05:30.000Z')

    expect(isDailySyncDue(schedule, new Date('2026-07-25T09:02:00.000Z'), now)).toBe(
      true,
    )
    // Next cron tick, 15 minutes later: already synced past the occurrence.
    expect(
      isDailySyncDue(schedule, afterFirstRun, new Date('2026-07-26T09:20:00.000Z')),
    ).toBe(false)
  })

  it('skips when the user already synced manually after the occurrence', () => {
    const now = new Date('2026-07-26T11:00:00.000Z')
    const manualSync = new Date('2026-07-26T10:30:00.000Z')
    expect(isDailySyncDue(scheduleAt(9), manualSync, now)).toBe(false)
  })

  it('still fires when a manual sync happened before the occurrence', () => {
    const now = new Date('2026-07-26T09:30:00.000Z')
    const manualSync = new Date('2026-07-26T07:00:00.000Z')
    expect(isDailySyncDue(scheduleAt(9), manualSync, now)).toBe(true)
  })

  it('catches up on a missed tick within the window', () => {
    const now = new Date('2026-07-26T13:00:00.000Z') // 4h late
    const lastSynced = new Date('2026-07-25T09:02:00.000Z')
    expect(isDailySyncDue(scheduleAt(9), lastSynced, now)).toBe(true)
  })

  it('gives up once the catch-up window has elapsed', () => {
    const now = new Date('2026-07-26T16:00:00.000Z') // 7h late
    const lastSynced = new Date('2026-07-25T09:02:00.000Z')
    expect(isDailySyncDue(scheduleAt(9), lastSynced, now)).toBe(false)
  })

  it('treats the catch-up boundary as inclusive', () => {
    const occurrence = new Date('2026-07-26T09:00:00.000Z')
    const lastSynced = new Date('2026-07-25T09:02:00.000Z')
    expect(
      isDailySyncDue(
        scheduleAt(9),
        lastSynced,
        new Date(occurrence.getTime() + CATCH_UP_WINDOW_MS),
      ),
    ).toBe(true)
    expect(
      isDailySyncDue(
        scheduleAt(9),
        lastSynced,
        new Date(occurrence.getTime() + CATCH_UP_WINDOW_MS + 1),
      ),
    ).toBe(false)
  })

  it('handles a schedule set just after midnight UTC', () => {
    const now = new Date('2026-07-26T00:10:00.000Z')
    const lastSynced = new Date('2026-07-25T00:05:00.000Z')
    expect(isDailySyncDue(scheduleAt(0, 5), lastSynced, now)).toBe(true)
  })

  it('does not replay a schedule the user just set for earlier today', () => {
    // User sets 08:00 at 20:00 local-UTC; the 12h-old occurrence is out of window.
    const now = new Date('2026-07-26T20:00:00.000Z')
    const lastSynced = new Date('2026-07-24T08:00:00.000Z')
    expect(isDailySyncDue(scheduleAt(8), lastSynced, now)).toBe(false)
    // ...and it fires normally at the next day's occurrence.
    expect(
      isDailySyncDue(scheduleAt(8), lastSynced, new Date('2026-07-27T08:05:00.000Z')),
    ).toBe(true)
  })

  it('respects a caller-supplied catch-up window', () => {
    const now = new Date('2026-07-26T10:00:00.000Z')
    const lastSynced = new Date('2026-07-25T09:02:00.000Z')
    expect(isDailySyncDue(scheduleAt(9), lastSynced, now, 2 * HOUR)).toBe(true)
    expect(isDailySyncDue(scheduleAt(9), lastSynced, now, 30 * 60 * 1000)).toBe(false)
  })
})
