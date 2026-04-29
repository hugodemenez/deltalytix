'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { NormalizedQuote, MarketStatus } from '@/lib/finnhub'

const POLL_INTERVAL_OPEN   = 15_000  // 15 sec when market is open
const POLL_INTERVAL_CLOSED = 60_000  // 60 sec when market is closed (save requests)

export interface QuoteWithStatus extends NormalizedQuote {
  marketStatus: MarketStatus
}

export interface UseRealtimeQuotesResult {
  quotes:      Record<string, QuoteWithStatus | { symbol: string; price: null; change: null; changePercent: null; marketStatus: MarketStatus }>
  marketStatus: MarketStatus
  isLoading:   boolean
  error:       string | null
  lastUpdated: Date | null
  refresh:     () => void
}

export function useRealtimeQuotes(symbols: string[]): UseRealtimeQuotesResult {
  const [quotes,       setQuotes]       = useState<UseRealtimeQuotesResult['quotes']>({})
  const [marketStatus, setMarketStatus] = useState<MarketStatus>('UNKNOWN')
  const [isLoading,    setIsLoading]    = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [lastUpdated,  setLastUpdated]  = useState<Date | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const symbolsKey = symbols.join(',')

  const fetchQuotes = useCallback(async () => {
    if (!symbols.length) return
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/quotes?symbols=${symbolsKey}`, {
        cache: 'no-store',
      })

      if (res.status === 401) {
        setError('Session expired — please refresh the page')
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data: { quotes: UseRealtimeQuotesResult['quotes']; marketStatus: MarketStatus } =
        await res.json()

      setQuotes(data.quotes)
      setMarketStatus(data.marketStatus)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quotes')
    } finally {
      setIsLoading(false)
    }
  }, [symbolsKey])

  // Adaptive polling interval based on market status
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    fetchQuotes().then(() => {
      const interval = marketStatus === 'OPEN' ? POLL_INTERVAL_OPEN : POLL_INTERVAL_CLOSED

      const tick = () => {
        fetchQuotes().then(() => {
          const next = marketStatus === 'OPEN' ? POLL_INTERVAL_OPEN : POLL_INTERVAL_CLOSED
          timerRef.current = setTimeout(tick, next)
        })
      }

      timerRef.current = setTimeout(tick, interval)
    })

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [fetchQuotes])

  return { quotes, marketStatus, isLoading, error, lastUpdated, refresh: fetchQuotes }
}
