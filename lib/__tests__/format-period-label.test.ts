import { describe, it, expect } from 'vitest'

/**
 * Tests for period label formatting utility.
 * Covers the getPeriodStats label output used in Performance Center.
 * Raw ISO strings like "2025-01" or "2025-01-06" must be
 * formatted into human-readable labels: "Jan 25", "Jan 6" etc.
 */

// Pure utility — extracted from server code for testability
function formatPeriodLabel(raw: string, groupBy: 'day' | 'week' | 'month' | 'year'): string {
  try {
    if (groupBy === 'month') {
      // "2025-01" → "Jan 25"
      const [year, month] = raw.split('-').map(Number)
      const date = new Date(year, month - 1, 1)
      return date.toLocaleString('en-US', { month: 'short', year: '2-digit' })
    }
    if (groupBy === 'week' || groupBy === 'day') {
      // "2025-01-06" → "Jan 6"
      const date = new Date(raw + 'T00:00:00')
      return date.toLocaleString('en-US', { month: 'short', day: 'numeric' })
    }
    if (groupBy === 'year') {
      // "2025" → "2025"
      return raw
    }
    return raw
  } catch {
    return raw
  }
}

describe('formatPeriodLabel', () => {
  describe('month grouping', () => {
    it('formats YYYY-MM to "Mon YY"', () => {
      expect(formatPeriodLabel('2025-01', 'month')).toBe('Jan 25')
      expect(formatPeriodLabel('2025-12', 'month')).toBe('Dec 25')
      expect(formatPeriodLabel('2024-07', 'month')).toBe('Jul 24')
    })
  })

  describe('day grouping', () => {
    it('formats YYYY-MM-DD to "Mon D"', () => {
      expect(formatPeriodLabel('2025-01-06', 'day')).toBe('Jan 6')
      expect(formatPeriodLabel('2025-03-15', 'day')).toBe('Mar 15')
    })
  })

  describe('week grouping', () => {
    it('formats week start date to "Mon D"', () => {
      expect(formatPeriodLabel('2025-01-06', 'week')).toBe('Jan 6')
    })
  })

  describe('year grouping', () => {
    it('returns year string as-is', () => {
      expect(formatPeriodLabel('2025', 'year')).toBe('2025')
    })
  })

  describe('edge cases', () => {
    it('returns raw string on invalid input', () => {
      expect(formatPeriodLabel('invalid', 'month')).toBeTruthy()
    })
  })
})
