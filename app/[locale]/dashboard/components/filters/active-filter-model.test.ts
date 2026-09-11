// @ts-nocheck
import { describe, expect, it } from 'bun:test'
import {
  startOfMonth,
  startOfWeek,
  endOfMonth,
  endOfWeek,
} from 'date-fns'
import {
  countActiveFilters,
  countSectionFilters,
  hasActiveFilters,
  labelDateRange,
} from './active-filter-model'

const labels = {
  thisWeek: 'This week',
  thisMonth: 'This month',
  lastThreeMonths: 'Last 3 months',
  lastSixMonths: 'Last 6 months',
}

describe('countActiveFilters', () => {
  it('counts each chip the strip would show', () => {
    expect(
      countActiveFilters({
        dateRange: { from: new Date('2026-08-10'), to: new Date('2026-08-16') },
        accountNumbers: ['A', 'B'],
        tagFilter: { tags: ['Long'] },
      })
    ).toBe(4)
  })

  it('is empty when nothing is on', () => {
    expect(hasActiveFilters({})).toBe(false)
    expect(countActiveFilters({})).toBe(0)
  })
})

describe('countSectionFilters', () => {
  it('counts only the filters that belong to that section', () => {
    const state = {
      dateRange: { from: new Date('2026-08-10'), to: new Date('2026-08-16') },
      weekdayFilter: { days: [1] },
      accountNumbers: ['A', 'B'],
      instruments: ['ES'],
      tagFilter: { tags: ['Long'] },
      pnlRange: { min: 0 },
    }

    expect(countSectionFilters('dateRange', state)).toBe(2)
    expect(countSectionFilters('accounts', state)).toBe(2)
    expect(countSectionFilters('instruments', state)).toBe(1)
    expect(countSectionFilters('tags', state)).toBe(1)
    expect(countSectionFilters('pnl', state)).toBe(1)
  })

  it('is zero when that section is empty', () => {
    expect(countSectionFilters('accounts', {})).toBe(0)
    expect(countSectionFilters('pnl', { pnlRange: {} })).toBe(0)
  })
})

describe('labelDateRange', () => {
  it('names this week', () => {
    const now = new Date()
    expect(
      labelDateRange(
        { from: startOfWeek(now), to: endOfWeek(now) },
        labels,
        () => 'custom'
      )
    ).toBe('This week')
  })

  it('names this month', () => {
    const now = new Date()
    expect(
      labelDateRange(
        { from: startOfMonth(now), to: endOfMonth(now) },
        labels,
        () => 'custom'
      )
    ).toBe('This month')
  })

  it('returns null when no date range is set', () => {
    expect(labelDateRange(undefined, labels, () => 'custom')).toBeNull()
    expect(labelDateRange({}, labels, () => 'custom')).toBeNull()
  })
})
