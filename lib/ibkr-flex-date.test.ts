import { describe, expect, it } from 'vitest'
import { parseFlexDateTime } from './ibkr-flex-date'

describe('parseFlexDateTime', () => {
  it('parses the Flex default yyyyMMdd;HHmmss form', () => {
    expect(parseFlexDateTime('20250115;093000')).toBe('2025-01-15T09:30:00.000+00:00')
  })

  it('parses a colon-separated time', () => {
    expect(parseFlexDateTime('20250115;09:30:00')).toBe('2025-01-15T09:30:00.000+00:00')
  })

  it('parses space- and T-separated forms', () => {
    expect(parseFlexDateTime('2025-01-15 09:30:00')).toBe('2025-01-15T09:30:00.000+00:00')
    expect(parseFlexDateTime('2025-01-15T09:30:00')).toBe('2025-01-15T09:30:00.000+00:00')
  })

  it('parses a date-only value as midnight UTC', () => {
    expect(parseFlexDateTime('20250115')).toBe('2025-01-15T00:00:00.000+00:00')
  })

  it('combines separate tradeDate and tradeTime attributes', () => {
    expect(parseFlexDateTime('20250115', '093000')).toBe('2025-01-15T09:30:00.000+00:00')
  })

  it('prefers an explicit time argument over one embedded in the same string', () => {
    expect(parseFlexDateTime('20250115;000000', '143000')).toBe(
      '2025-01-15T14:30:00.000+00:00',
    )
  })

  it('applies a numeric UTC offset', () => {
    expect(parseFlexDateTime('20250115;093000 -05:00')).toBe('2025-01-15T14:30:00.000+00:00')
    expect(parseFlexDateTime('20250115;093000 +0100')).toBe('2025-01-15T08:30:00.000+00:00')
  })

  it('applies a named timezone abbreviation', () => {
    expect(parseFlexDateTime('20250115;093000 EST')).toBe('2025-01-15T14:30:00.000+00:00')
    expect(parseFlexDateTime('20250115;093000 UTC')).toBe('2025-01-15T09:30:00.000+00:00')
  })

  it('refuses ambiguous slash dates rather than guessing day/month order', () => {
    expect(parseFlexDateTime('03/04/2025')).toBeNull()
    expect(parseFlexDateTime('03/04/2025;093000')).toBeNull()
  })

  it('rejects impossible calendar dates instead of rolling them over', () => {
    expect(parseFlexDateTime('20250231')).toBeNull()
    expect(parseFlexDateTime('20251301')).toBeNull()
  })

  it('rejects a present-but-unreadable time instead of falling back to midnight', () => {
    expect(parseFlexDateTime('20250115;9999')).toBeNull()
    expect(parseFlexDateTime('20250115;25:00:00')).toBeNull()
  })

  it('returns null for empty and missing input', () => {
    expect(parseFlexDateTime(null)).toBeNull()
    expect(parseFlexDateTime(undefined)).toBeNull()
    expect(parseFlexDateTime('')).toBeNull()
  })
})
