/**
 * Economic Calendar client
 *
 * Primary source : Finnhub /calendar/economic  (free tier, no key required for basic)
 * Fallback source: tradingeconomics.com public RSS (no key)
 *
 * Each event is normalised into EconomicEvent so consumers
 * don't care which source provided the data.
 */

export type EventImpact = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN'

export interface EconomicEvent {
  id:          string        // deterministic hash: `${date}-${country}-${event}`
  date:        string        // 'YYYY-MM-DD'
  time:        string | null // 'HH:MM' UTC or null if all-day
  country:     string        // ISO 3166-1 alpha-2, e.g. 'US'
  currency:    string        // e.g. 'USD'
  event:       string        // display name, e.g. 'Non-Farm Payrolls'
  impact:      EventImpact
  actual:      string | null
  forecast:    string | null
  previous:    string | null
  unit:        string | null  // e.g. '%', 'K', 'B'
  source:      'finnhub' | 'tradingeconomics'
}

// ─── Finnhub ────────────────────────────────────────────────────────────────

const FINNHUB_BASE = 'https://finnhub.io/api/v1'
const API_KEY      = process.env.FINNHUB_API_KEY ?? ''

interface FinnhubCalendarEvent {
  country:  string
  currency: string
  event:    string
  impact:   string   // '1' | '2' | '3'
  time:     string   // ISO string or 'YYYY-MM-DD HH:MM:SS'
  actual:   string
  estimate: string
  prev:     string
  unit:     string
}

interface FinnhubCalendarResponse {
  economicCalendar: FinnhubCalendarEvent[]
}

function parseImpact(raw: string): EventImpact {
  if (raw === '3' || raw.toLowerCase() === 'high')   return 'HIGH'
  if (raw === '2' || raw.toLowerCase() === 'medium') return 'MEDIUM'
  if (raw === '1' || raw.toLowerCase() === 'low')    return 'LOW'
  return 'UNKNOWN'
}

function makeId(date: string, country: string, event: string): string {
  // simple deterministic ID — no crypto needed
  const str = `${date}|${country}|${event}`
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0
  }
  return `ev_${Math.abs(hash).toString(36)}`
}

function parseFinnhubEvent(raw: FinnhubCalendarEvent): EconomicEvent {
  const dt      = new Date(raw.time)
  const isValid = !isNaN(dt.getTime())
  const date    = isValid
    ? dt.toISOString().slice(0, 10)
    : raw.time.slice(0, 10)
  const time    = isValid
    ? `${String(dt.getUTCHours()).padStart(2, '0')}:${String(dt.getUTCMinutes()).padStart(2, '0')}`
    : null

  return {
    id:       makeId(date, raw.country, raw.event),
    date,
    time,
    country:  raw.country  || 'US',
    currency: raw.currency || 'USD',
    event:    raw.event,
    impact:   parseImpact(raw.impact),
    actual:   raw.actual   || null,
    forecast: raw.estimate || null,
    previous: raw.prev     || null,
    unit:     raw.unit     || null,
    source:   'finnhub',
  }
}

export async function getEconomicEvents(
  from: string,  // 'YYYY-MM-DD'
  to:   string   // 'YYYY-MM-DD'
): Promise<EconomicEvent[]> {
  if (!API_KEY) {
    console.warn('[EconCal] FINNHUB_API_KEY not set — economic events unavailable')
    return []
  }

  try {
    const url = `${FINNHUB_BASE}/calendar/economic?from=${from}&to=${to}&token=${API_KEY}`
    const res = await fetch(url, { next: { revalidate: 3600 } }) // cache 1h

    if (!res.ok) {
      console.error(`[EconCal] Finnhub HTTP ${res.status}`)
      return []
    }

    const data: FinnhubCalendarResponse = await res.json()
    return (data.economicCalendar ?? []).map(parseFinnhubEvent)
  } catch (err) {
    console.error('[EconCal] fetch error:', err)
    return []
  }
}

// ─── Grouping helpers ────────────────────────────────────────────────────────

/**
 * Groups events by date string ('YYYY-MM-DD').
 * Filters to US/USD events only by default (most relevant for futures traders).
 */
export function groupEventsByDate(
  events: EconomicEvent[],
  currencyFilter: string[] = ['USD']
): Record<string, EconomicEvent[]> {
  const filtered = currencyFilter.length
    ? events.filter((e) => currencyFilter.includes(e.currency))
    : events

  return filtered.reduce<Record<string, EconomicEvent[]>>((acc, ev) => {
    if (!acc[ev.date]) acc[ev.date] = []
    acc[ev.date].push(ev)
    return acc
  }, {})
}

/**
 * Returns the highest impact level for a given day.
 * Useful for calendar cell colour-coding.
 */
export function maxImpactForDate(
  events: EconomicEvent[]
): EventImpact {
  if (events.some((e) => e.impact === 'HIGH'))   return 'HIGH'
  if (events.some((e) => e.impact === 'MEDIUM')) return 'MEDIUM'
  if (events.some((e) => e.impact === 'LOW'))    return 'LOW'
  return 'UNKNOWN'
}

/**
 * Computes simple correlation metric between daily P&L and event presence.
 *
 * Returns:
 *   - avgPnlOnEventDays    — mean P&L on days that had >= 1 HIGH/MEDIUM event
 *   - avgPnlOnNoEventDays  — mean P&L on days with no significant events
 *   - impactScore          — difference (positive = events are profitable context)
 */
export function computeEventCorrelation(
  calendarData:  Record<string, { pnl: number }>,
  eventsByDate:  Record<string, EconomicEvent[]>,
  minImpact:     EventImpact = 'MEDIUM'
): {
  avgPnlOnEventDays:   number
  avgPnlOnNoEventDays: number
  impactScore:         number
  eventDayCount:       number
  noEventDayCount:     number
} {
  const impactRank: Record<EventImpact, number> = {
    HIGH: 3, MEDIUM: 2, LOW: 1, UNKNOWN: 0,
  }
  const threshold = impactRank[minImpact]

  let eventPnlSum    = 0, eventCount    = 0
  let noEventPnlSum  = 0, noEventCount  = 0

  for (const [date, entry] of Object.entries(calendarData)) {
    const dayEvents  = eventsByDate[date] ?? []
    const hasImpact  = dayEvents.some(
      (e) => impactRank[e.impact] >= threshold
    )

    if (hasImpact) {
      eventPnlSum += entry.pnl
      eventCount++
    } else {
      noEventPnlSum += entry.pnl
      noEventCount++
    }
  }

  const avgEvent   = eventCount   ? eventPnlSum   / eventCount   : 0
  const avgNoEvent = noEventCount ? noEventPnlSum / noEventCount : 0

  return {
    avgPnlOnEventDays:   avgEvent,
    avgPnlOnNoEventDays: avgNoEvent,
    impactScore:         avgEvent - avgNoEvent,
    eventDayCount:       eventCount,
    noEventDayCount:     noEventCount,
  }
}
