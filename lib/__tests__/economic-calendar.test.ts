import { describe, it, expect } from 'vitest'
import {
  groupEventsByDate,
  maxImpactForDate,
  computeEventCorrelation,
  makeId,
} from '../economic-calendar'
import type { EconomicEvent } from '../economic-calendar'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const makeEvent = (overrides: Partial<EconomicEvent>): EconomicEvent => ({
  id:       'ev_test',
  date:     '2025-05-01',
  time:     '13:30',
  country:  'US',
  currency: 'USD',
  event:    'Test Event',
  impact:   'MEDIUM',
  actual:   null,
  forecast: null,
  previous: null,
  unit:     null,
  source:   'finnhub',
  ...overrides,
})

const HIGH_EVENT   = makeEvent({ id: 'ev_1', date: '2025-05-01', impact: 'HIGH',   event: 'NFP' })
const MEDIUM_EVENT = makeEvent({ id: 'ev_2', date: '2025-05-01', impact: 'MEDIUM', event: 'CPI' })
const LOW_EVENT    = makeEvent({ id: 'ev_3', date: '2025-05-02', impact: 'LOW',    event: 'Housing' })
const EUR_EVENT    = makeEvent({ id: 'ev_4', date: '2025-05-01', impact: 'HIGH',   currency: 'EUR', country: 'DE', event: 'ECB Rate' })

// ─── groupEventsByDate ────────────────────────────────────────────────────────

describe('groupEventsByDate', () => {
  it('groups events by date', () => {
    const result = groupEventsByDate([HIGH_EVENT, MEDIUM_EVENT, LOW_EVENT], ['USD'])
    expect(Object.keys(result)).toContain('2025-05-01')
    expect(Object.keys(result)).toContain('2025-05-02')
    expect(result['2025-05-01']).toHaveLength(2)
    expect(result['2025-05-02']).toHaveLength(1)
  })

  it('filters by currency', () => {
    const result = groupEventsByDate([HIGH_EVENT, EUR_EVENT], ['USD'])
    expect(result['2025-05-01']).toHaveLength(1)
    expect(result['2025-05-01'][0].currency).toBe('USD')
  })

  it('includes all currencies when filter is empty', () => {
    const result = groupEventsByDate([HIGH_EVENT, EUR_EVENT], [])
    expect(result['2025-05-01']).toHaveLength(2)
  })

  it('returns empty object for no events', () => {
    expect(groupEventsByDate([], ['USD'])).toEqual({})
  })
})

// ─── maxImpactForDate ─────────────────────────────────────────────────────────

describe('maxImpactForDate', () => {
  it('returns HIGH when HIGH event exists', () => {
    expect(maxImpactForDate([HIGH_EVENT, MEDIUM_EVENT, LOW_EVENT])).toBe('HIGH')
  })

  it('returns MEDIUM when no HIGH event', () => {
    expect(maxImpactForDate([MEDIUM_EVENT, LOW_EVENT])).toBe('MEDIUM')
  })

  it('returns LOW when only LOW events', () => {
    expect(maxImpactForDate([LOW_EVENT])).toBe('LOW')
  })

  it('returns UNKNOWN for empty array', () => {
    expect(maxImpactForDate([])).toBe('UNKNOWN')
  })
})

// ─── computeEventCorrelation ──────────────────────────────────────────────────

describe('computeEventCorrelation', () => {
  const calendarData = {
    '2025-05-01': { pnl: 500 },   // has HIGH event
    '2025-05-02': { pnl: -200 },  // has LOW event (below MEDIUM threshold)
    '2025-05-05': { pnl: 300 },   // no events
    '2025-05-06': { pnl: 100 },   // no events
  }

  const eventsByDate = {
    '2025-05-01': [HIGH_EVENT],
    '2025-05-02': [LOW_EVENT],
  }

  it('correctly counts event and no-event days', () => {
    const result = computeEventCorrelation(calendarData, eventsByDate)
    expect(result.eventDayCount).toBe(1)   // 05-01 has HIGH
    expect(result.noEventDayCount).toBe(3) // 05-02 LOW below threshold, 05-05, 05-06
  })

  it('computes correct avg P&L for event days', () => {
    const result = computeEventCorrelation(calendarData, eventsByDate)
    expect(result.avgPnlOnEventDays).toBe(500)
  })

  it('computes correct avg P&L for no-event days', () => {
    const result = computeEventCorrelation(calendarData, eventsByDate)
    // (-200 + 300 + 100) / 3 = 66.666...
    expect(result.avgPnlOnNoEventDays).toBeCloseTo(66.67, 1)
  })

  it('computes impact score = event avg - no-event avg', () => {
    const result = computeEventCorrelation(calendarData, eventsByDate)
    expect(result.impactScore).toBeCloseTo(500 - 66.67, 0)
  })

  it('handles all days having no events', () => {
    const result = computeEventCorrelation(calendarData, {})
    expect(result.eventDayCount).toBe(0)
    expect(result.avgPnlOnEventDays).toBe(0)
    expect(result.impactScore).toBe(0)
  })

  it('handles empty calendar', () => {
    const result = computeEventCorrelation({}, eventsByDate)
    expect(result.eventDayCount).toBe(0)
    expect(result.noEventDayCount).toBe(0)
  })

  it('respects custom minImpact = LOW', () => {
    const result = computeEventCorrelation(calendarData, eventsByDate, 'LOW')
    // Both 05-01 (HIGH) and 05-02 (LOW) now count as event days
    expect(result.eventDayCount).toBe(2)
    expect(result.noEventDayCount).toBe(2)
  })
})
