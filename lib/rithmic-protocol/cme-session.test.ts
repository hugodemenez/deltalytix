import { describe, expect, it } from 'vitest'
import {
  cmeWeeklyCloseAtOrBefore,
  globexSessionOpenForTradeDate,
  planFillHistoryRange,
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

describe('planFillHistoryRange', () => {
  it('starts ShowFillHistory on the UTC day after the weekly close', () => {
    const requested = new Date('2026-10-28T00:00:00.000Z') // Wednesday
    const planned = planFillHistoryRange(requested)
    expect(planned.weeklyClose.toISOString()).toBe('2026-10-23T22:00:00.000Z')
    expect(planned.startUtc.toISOString()).toBe('2026-10-24T00:00:00.000Z')
    expect(planned.startUtc.getTime()).toBeLessThanOrEqual(requested.getTime())
  })

  it('does not start on Friday\'s trade date (that session ends at the close)', () => {
    const planned = planFillHistoryRange(new Date('2026-11-07T00:00:00.000Z'))
    expect(planned.weeklyClose.toISOString()).toBe('2026-11-06T23:00:00.000Z')
    expect(planned.startUtc.toISOString()).toBe('2026-11-07T00:00:00.000Z')
  })
})

describe('utcCalendarDayAfter', () => {
  it('advances past a Friday evening UTC close', () => {
    expect(
      utcCalendarDayAfter(new Date('2026-10-30T22:00:00.000Z')).toISOString(),
    ).toBe('2026-10-31T00:00:00.000Z')
  })
})

describe('globexSessionOpenForTradeDate', () => {
  it('uses the previous calendar day 17:00 CT, not UTC midnight of the trade date', () => {
    // Monday 26 Oct 2026 trade date → Sunday 25 Oct 17:00 CDT = 22:00 UTC.
    const sessionOpen = globexSessionOpenForTradeDate('20261026')
    expect(sessionOpen?.toISOString()).toBe('2026-10-25T22:00:00.000Z')
    const utcMidnight = Date.parse('2026-10-26T00:00:00.000Z')
    const fridayClose = Date.parse('2026-10-23T22:00:00.000Z')
    // UTC midnight of Monday is after Friday's weekly close, not before it.
    expect(utcMidnight).toBeGreaterThan(fridayClose)
    // It is also two hours after Globex reopen (Sunday 17:00 CT). Evening
    // fills without ssboe belong at session open, not at UTC midnight.
    expect(sessionOpen?.getTime()).toBeLessThan(utcMidnight)
    expect(sessionOpen?.getTime()).toBeGreaterThan(fridayClose)
  })
})
