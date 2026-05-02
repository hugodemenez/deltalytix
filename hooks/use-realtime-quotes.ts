/**
 * useRealtimeQuotes — хук для получения живых котировок
 *
 * Использует polling каждые 15 секунд (бесплатный Finnhub tier).
 * При наличии платного ключа можно заменить на WebSocket.
 *
 * Использование:
 *   const { quotes, isLoading } = useRealtimeQuotes(['ES', 'NQ', 'MNQ'])
 */
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { NormalizedQuote } from '@/lib/finnhub'

const POLL_INTERVAL = 15_000 // 15 секунд

export interface UseRealtimeQuotesResult {
  quotes: Record<string, NormalizedQuote>
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
  refresh: () => void
}

export function useRealtimeQuotes(
  symbols: string[]
): UseRealtimeQuotesResult {
  const [quotes, setQuotes] = useState<Record<string, NormalizedQuote>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchQuotes = useCallback(async () => {
    if (!symbols.length) return
    setIsLoading(true)
    setError(null)

    try {
      const params = symbols.join(',')
      const res = await fetch(`/api/quotes?symbols=${params}`, {
        cache: 'no-store',
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data: Record<string, NormalizedQuote> = await res.json()
      setQuotes(data)
      setLastUpdated(new Date())
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка загрузки котировок'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [symbols.join(',')])

  useEffect(() => {
    fetchQuotes()
    timerRef.current = setInterval(fetchQuotes, POLL_INTERVAL)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [fetchQuotes])

  return { quotes, isLoading, error, lastUpdated, refresh: fetchQuotes }
}
