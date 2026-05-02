'use client'

import { useState, useEffect, useCallback } from 'react'
import type { EconomicEvent, EventImpact } from '@/lib/economic-calendar'
import { groupEventsByDate, maxImpactForDate, computeEventCorrelation } from '@/lib/economic-calendar'
import type { CalendarData } from '@/app/[locale]/dashboard/types/calendar'

export interface UseEconomicEventsResult {
  events:         EconomicEvent[]
  byDate:         Record<string, EconomicEvent[]>
  maxImpactByDate: Record<string, EventImpact>
  correlation:    ReturnType<typeof computeEventCorrelation> | null
  isLoading:      boolean
  error:          string | null
}

/**
 * Fetches economic events for the visible calendar month.
 * Optionally computes P&L correlation if calendarData is provided.
 */
export function useEconomicEvents(
  year:          number,
  month:         number, // 0-indexed (JS Date convention)
  calendarData?: CalendarData,
  currencies:    string[] = ['USD']
): UseEconomicEventsResult {
  const [events,   setEvents]   = useState<EconomicEvent[]>([])
  const [byDate,   setByDate]   = useState<Record<string, EconomicEvent[]>>({})
  const [isLoading, setLoading] = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  // Extend ±7 days around month edges to catch events near boundaries
  const from = new Date(year, month, 1)
  from.setDate(from.getDate() - 7)
  const to = new Date(year, month + 1, 0)
  to.setDate(to.getDate() + 7)

  const fromStr = from.toISOString().slice(0, 10)
  const toStr   = to.toISOString().slice(0, 10)
  const cKey    = currencies.join(',')

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/economic-events?from=${fromStr}&to=${toStr}&currency=${cKey}`,
        { cache: 'force-cache' }  // reuse server-side 1h cache
      )
      if (res.status === 401) { setError('Session expired'); return }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data: { events: EconomicEvent[]; byDate: Record<string, EconomicEvent[]> } =
        await res.json()

      setEvents(data.events)
      setByDate(data.byDate)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }, [fromStr, toStr, cKey])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  const maxImpactByDate = Object.fromEntries(
    Object.entries(byDate).map(([date, evs]) => [date, maxImpactForDate(evs)])
  ) as Record<string, EventImpact>

  const correlation = calendarData
    ? computeEventCorrelation(calendarData, byDate)
    : null

  return { events, byDate, maxImpactByDate, correlation, isLoading, error }
}
