import { describe, expect, it } from 'vitest'
import {
  buildUtcFillHistoryWindows,
  cmeWeeklyCloseAtOrBefore,
  resolveAdminWeekendAnchor,
  toUtcYyyyMmDd,
  utcCalendarDayAfter,
} from './cme-session'

describe('cmeWeeklyCloseAtOrBefore', () => {
  it('uses Friday 17:00 CDT (UTC−5) before the November 2026 DST fall-back', () => {
    // Friday 30 Oct 2026 is still CDT. 17:00 CDT = 22:00 UTC.
    expect(
      cmeWeeklyCloseAtOrBefore(new Date('2026-10-31T00:00:00.000Z')).toISOString(),
    ).toBe('2026-10-30T22:00:00.000Z')
  })

  it('uses Friday 17:00 CST (UTC−6) after the November 2026 DST fall-back', () => {
    // DST ends Sunday 1 Nov 2026. Friday 6 Nov is CST. 17:00 CST = 23:00 UTC.
    expect(
      cmeWeeklyCloseAtOrBefore(new Date('2026-11-07T00:00:00.000Z')).toISOString(),
    ).toBe('2026-11-06T23:00:00.000Z')
  })

  it('walks back a full week when the instant is Friday before 17:00 CT', () => {
    // Friday 30 Oct 2026 16:00 CDT = 21:00 UTC — still the open session.
    expect(
      cmeWeeklyCloseAtOrBefore(new Date('2026-10-30T21:00:00.000Z')).toISOString(),
    ).toBe('2026-10-23T22:00:00.000Z')
  })

  it('counts Friday 17:00:00 CT as this week\'s close', () => {
    expect(
      cmeWeeklyCloseAtOrBefore(new Date('2026-10-30T22:00:00.000Z')).toISOString(),
    ).toBe('2026-10-30T22:00:00.000Z')
  })

  it('uses Friday 17:00 CST before the March 2026 DST spring-forward', () => {
    // Friday 6 Mar 2026 is CST. 17:00 CST = 23:00 UTC.
    expect(
      cmeWeeklyCloseAtOrBefore(new Date('2026-03-07T00:00:00.000Z')).toISOString(),
    ).toBe('2026-03-06T23:00:00.000Z')
  })

  it('uses Friday 17:00 CDT after the March 2026 DST spring-forward', () => {
    // DST starts Sunday 8 Mar 2026. Friday 13 Mar is CDT. 17:00 CDT = 22:00 UTC.
    expect(
      cmeWeeklyCloseAtOrBefore(new Date('2026-03-14T00:00:00.000Z')).toISOString(),
    ).toBe('2026-03-13T22:00:00.000Z')
  })
})

describe('resolveAdminWeekendAnchor', () => {
  it('defaults to the most recent Friday close before the earliest fill needed', () => {
    const earliest = Date.parse('2026-11-04T15:00:00.000Z') // Wednesday
    const resolved = resolveAdminWeekendAnchor({ earliestNeededMs: earliest })
    expect(resolved.weeklyClose.toISOString()).toBe('2026-10-30T22:00:00.000Z')
    expect(resolved.historyStartYmd).toBe('2026-10-30')
  })

  it('treats an admin YYYY-MM-DD of a Friday as that Friday\'s 17:00 CT close', () => {
    const resolved = resolveAdminWeekendAnchor({
      requestedAnchor: '2026-10-23',
      earliestNeededMs: Date.parse('2026-11-04T15:00:00.000Z'),
    })
    expect(resolved.weeklyClose.toISOString()).toBe('2026-10-23T22:00:00.000Z')
    expect(resolved.historyStartYmd).toBe('2026-10-23')
  })

  it('accepts an ISO timestamp and still snaps back to the weekly close', () => {
    const resolved = resolveAdminWeekendAnchor({
      requestedAnchor: '2026-11-04T18:00:00.000Z',
      earliestNeededMs: Date.now(),
    })
    expect(resolved.weeklyClose.toISOString()).toBe('2026-10-30T22:00:00.000Z')
  })

  it('rejects an unparseable admin anchor', () => {
    expect(() =>
      resolveAdminWeekendAnchor({
        requestedAnchor: 'next friday',
        earliestNeededMs: Date.now(),
      }),
    ).toThrow(/INVALID_ANCHOR_DATE/)
  })
})

describe('utcCalendarDayAfter', () => {
  it('advances past a Friday evening UTC close', () => {
    expect(
      utcCalendarDayAfter(new Date('2026-10-30T22:00:00.000Z')).toISOString(),
    ).toBe('2026-10-31T00:00:00.000Z')
  })
})

describe('buildUtcFillHistoryWindows', () => {
  it('splits a long range into inclusive ≤30-day windows', () => {
    const windows = buildUtcFillHistoryWindows(
      new Date('2026-09-01T00:00:00.000Z'),
      new Date('2026-10-15T00:00:00.000Z'),
      30,
    )
    expect(windows.map((window) => toUtcYyyyMmDd(window.start))).toEqual([
      '2026-09-01',
      '2026-10-01',
    ])
    expect(toUtcYyyyMmDd(windows[1].end)).toBe('2026-10-15')
  })
})
