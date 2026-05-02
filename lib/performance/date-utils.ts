// ─── Phase 6: date range helpers ─────────────────────────────────────────────
import type { PeriodRange } from './types'

export function resolveDateRange(period: PeriodRange): { from: Date; to: Date; label: string } {
  const now = new Date()

  if (period.type === 'custom' && period.from && period.to) {
    return {
      from: new Date(period.from),
      to: new Date(period.to),
      label: `${period.from} – ${period.to}`,
    }
  }

  const offset = period.offset ?? 0

  if (period.type === 'week') {
    const startOfThisWeek = startOfWeek(now)
    const from = addDays(startOfThisWeek, offset * 7)
    const to = addDays(from, 6)
    return { from, to, label: `Week of ${fmt(from)}` }
  }

  if (period.type === 'month') {
    const from = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    const to = new Date(from.getFullYear(), from.getMonth() + 1, 0)
    return {
      from,
      to,
      label: from.toLocaleString('default', { month: 'long', year: 'numeric' }),
    }
  }

  if (period.type === 'quarter') {
    const q = Math.floor(now.getMonth() / 3) + offset
    const year = now.getFullYear() + Math.floor(q / 4)
    const qNorm = ((q % 4) + 4) % 4
    const from = new Date(year, qNorm * 3, 1)
    const to = new Date(year, qNorm * 3 + 3, 0)
    return { from, to, label: `Q${qNorm + 1} ${year}` }
  }

  if (period.type === 'year') {
    const year = now.getFullYear() + offset
    return {
      from: new Date(year, 0, 1),
      to: new Date(year, 11, 31),
      label: String(year),
    }
  }

  // fallback: current month
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { from, to, label: 'Current Month' }
}

function startOfWeek(d: Date): Date {
  const day = d.getDay()
  const diff = (day + 6) % 7
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  r.setDate(d.getDate() - diff)
  return r
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + days)
  return r
}

function fmt(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function previousPeriod(period: PeriodRange): PeriodRange {
  return { ...period, offset: (period.offset ?? 0) - 1 }
}
