import { describe, expect, it } from 'vitest'
import {
  SYNC_INTERVAL_OPTIONS,
  TICK_TOLERANCE_MS,
  isConnectionSyncDue,
  isIntervalSyncDue,
  isSupportedSyncInterval,
  lastIntervalOccurrence,
  nextIntervalOccurrence,
  syncScheduleMode,
} from './connection-sync-schedule'

describe('isSupportedSyncInterval', () => {
  it('accepts every offered cadence', () => {
    for (const interval of SYNC_INTERVAL_OPTIONS) {
      expect(isSupportedSyncInterval(interval)).toBe(true)
    }
  })

  it('rejects anything else', () => {
    for (const value of [0, -5, 1, 7, 1440, 3.5, '15', null, undefined, {}]) {
      expect(isSupportedSyncInterval(value)).toBe(false)
    }
  })

  it('only offers cadences that divide a day evenly', () => {
    for (const interval of SYNC_INTERVAL_OPTIONS) {
      expect(1440 % interval).toBe(0)
    }
  })
})

describe('lastIntervalOccurrence', () => {
  it('lands on clean clock times', () => {
    const now = new Date('2026-07-26T14:37:00.000Z')
    expect(lastIntervalOccurrence(5, now, 0).toISOString()).toBe(
      '2026-07-26T14:35:00.000Z',
    )
    expect(lastIntervalOccurrence(30, now, 0).toISOString()).toBe(
      '2026-07-26T14:30:00.000Z',
    )
    expect(lastIntervalOccurrence(60, now, 0).toISOString()).toBe(
      '2026-07-26T14:00:00.000Z',
    )
    expect(lastIntervalOccurrence(240, now, 0).toISOString()).toBe(
      '2026-07-26T12:00:00.000Z',
    )
    expect(lastIntervalOccurrence(720, now, 0).toISOString()).toBe(
      '2026-07-26T12:00:00.000Z',
    )
  })

  it('counts an occurrence a cron tick fired slightly early', () => {
    const justEarly = new Date('2026-07-26T14:34:58.000Z')
    expect(lastIntervalOccurrence(5, justEarly).toISOString()).toBe(
      '2026-07-26T14:35:00.000Z',
    )
    expect(lastIntervalOccurrence(5, justEarly, 0).toISOString()).toBe(
      '2026-07-26T14:30:00.000Z',
    )
  })
})

describe('nextIntervalOccurrence', () => {
  it('returns the first occurrence after now', () => {
    const now = new Date('2026-07-26T14:37:00.000Z')
    expect(nextIntervalOccurrence(5, now).toISOString()).toBe(
      '2026-07-26T14:40:00.000Z',
    )
    expect(nextIntervalOccurrence(240, now).toISOString()).toBe(
      '2026-07-26T16:00:00.000Z',
    )
  })

  it('moves past an occurrence landing exactly on now', () => {
    const now = new Date('2026-07-26T14:00:00.000Z')
    expect(nextIntervalOccurrence(60, now).toISOString()).toBe(
      '2026-07-26T15:00:00.000Z',
    )
  })
})

describe('isIntervalSyncDue', () => {
  it('is never due without a cadence', () => {
    const now = new Date('2026-07-26T14:37:00.000Z')
    const lastSynced = new Date('2026-07-26T10:00:00.000Z')
    expect(isIntervalSyncDue(null, lastSynced, now)).toBe(false)
    expect(isIntervalSyncDue(0, lastSynced, now)).toBe(false)
    expect(isIntervalSyncDue(-30, lastSynced, now)).toBe(false)
  })

  it('fires once the occurrence has passed', () => {
    const now = new Date('2026-07-26T14:02:00.000Z')
    expect(
      isIntervalSyncDue(5, new Date('2026-07-26T13:56:00.000Z'), now),
    ).toBe(true)
  })

  it('does not fire twice for the same occurrence', () => {
    // Synced at 14:00:20 for the 14:00 occurrence; next tick is 5 minutes later.
    const afterRun = new Date('2026-07-26T14:00:20.000Z')
    expect(
      isIntervalSyncDue(5, afterRun, new Date('2026-07-26T14:03:00.000Z')),
    ).toBe(false)
    expect(
      isIntervalSyncDue(5, afterRun, new Date('2026-07-26T14:05:10.000Z')),
    ).toBe(true)
  })

  it('holds a failing connection to one retry per interval', () => {
    // lastSyncedAt does not move while syncs fail, so the only thing gating a
    // retry is the occurrence grid — not how often the cron ticks.
    const staleSync = new Date('2026-07-26T08:00:00.000Z')
    expect(
      isIntervalSyncDue(240, staleSync, new Date('2026-07-26T09:00:00.000Z')),
    ).toBe(false)
    expect(
      isIntervalSyncDue(240, staleSync, new Date('2026-07-26T11:55:00.000Z')),
    ).toBe(false)
    expect(
      isIntervalSyncDue(240, staleSync, new Date('2026-07-26T12:00:00.000Z')),
    ).toBe(true)
  })

  it('skips an occurrence the user already covered manually', () => {
    const manualSync = new Date('2026-07-26T12:30:00.000Z')
    expect(
      isIntervalSyncDue(240, manualSync, new Date('2026-07-26T14:00:00.000Z')),
    ).toBe(false)
  })

  it('treats the tolerance window as the occurrence boundary', () => {
    const lastSynced = new Date('2026-07-26T13:30:00.000Z')
    const occurrence = new Date('2026-07-26T14:00:00.000Z')
    expect(
      isIntervalSyncDue(
        30,
        lastSynced,
        new Date(occurrence.getTime() - TICK_TOLERANCE_MS),
      ),
    ).toBe(true)
    expect(
      isIntervalSyncDue(
        30,
        lastSynced,
        new Date(occurrence.getTime() - TICK_TOLERANCE_MS - 1),
      ),
    ).toBe(false)
  })
})

describe('syncScheduleMode', () => {
  const dailyTime = new Date(Date.UTC(2020, 0, 1, 9, 0, 0, 0))

  it('reads the cadence first, then the daily time', () => {
    expect(
      syncScheduleMode({ syncIntervalMinutes: 30, dailySyncTime: null }),
    ).toBe('interval')
    expect(
      syncScheduleMode({ syncIntervalMinutes: null, dailySyncTime: dailyTime }),
    ).toBe('daily')
    expect(
      syncScheduleMode({ syncIntervalMinutes: null, dailySyncTime: null }),
    ).toBe('off')
  })

  it('lets a cadence win over a leftover daily time', () => {
    expect(
      syncScheduleMode({ syncIntervalMinutes: 60, dailySyncTime: dailyTime }),
    ).toBe('interval')
  })
})

describe('isConnectionSyncDue', () => {
  const dailyAtNine = new Date(Date.UTC(2020, 0, 1, 9, 0, 0, 0))

  it('runs the daily schedule when there is no cadence', () => {
    const lastSynced = new Date('2026-07-25T09:02:00.000Z')
    expect(
      isConnectionSyncDue(
        { syncIntervalMinutes: null, dailySyncTime: dailyAtNine },
        lastSynced,
        new Date('2026-07-26T09:05:00.000Z'),
      ),
    ).toBe(true)
    expect(
      isConnectionSyncDue(
        { syncIntervalMinutes: null, dailySyncTime: dailyAtNine },
        lastSynced,
        new Date('2026-07-26T08:55:00.000Z'),
      ),
    ).toBe(false)
  })

  it('ignores the daily time once a cadence is set', () => {
    // 03:05 is nowhere near the 09:00 daily time, but the hourly grid is due.
    expect(
      isConnectionSyncDue(
        { syncIntervalMinutes: 60, dailySyncTime: dailyAtNine },
        new Date('2026-07-26T02:10:00.000Z'),
        new Date('2026-07-26T03:05:00.000Z'),
      ),
    ).toBe(true)
  })

  it('is never due without a schedule', () => {
    expect(
      isConnectionSyncDue(
        { syncIntervalMinutes: null, dailySyncTime: null },
        new Date('2026-07-01T00:00:00.000Z'),
        new Date('2026-07-26T09:05:00.000Z'),
      ),
    ).toBe(false)
  })
})
