'use client'

import { useEffect, useState, useCallback } from 'react'
import type { BehavioralPatternDetection } from '@/lib/behavioral-analytics'

export interface BehavioralAnalyticsResponse {
  detections: BehavioralPatternDetection[]
  summary: {
    count:        number
    estimatedLoss: number
    byType:       Record<string, number>
  }
  meta: {
    total:    number
    filtered: number
    from:     string | null
    to:       string | null
  }
}

interface Params {
  accountNumber?: string
  from?:          string   // ISO date, e.g. '2025-01-01'
  to?:            string   // ISO date, e.g. '2025-12-31'
  limit?:         number
}

export function useBehavioralAnalytics(params: Params = {}) {
  const [data,      setData]      = useState<BehavioralAnalyticsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const fetchData = useCallback(async (signal: AbortSignal) => {
    setIsLoading(true)
    setError(null)

    try {
      const query = new URLSearchParams()
      if (params.accountNumber) query.set('accountNumber', params.accountNumber)
      if (params.from)          query.set('from',          params.from)
      if (params.to)            query.set('to',            params.to)
      if (params.limit)         query.set('limit',         String(params.limit))

      const res = await fetch(
        `/api/behavioral-analytics${query.toString() ? `?${query}` : ''}`,
        { signal, cache: 'no-store' }
      )

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const json: BehavioralAnalyticsResponse = await res.json()
      setData(json)
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Failed to load behavioral analytics')
    } finally {
      setIsLoading(false)
    }
  }, [
    params.accountNumber,
    params.from,
    params.to,
    params.limit,
  ])

  useEffect(() => {
    const controller = new AbortController()
    fetchData(controller.signal)
    return () => controller.abort()
  }, [fetchData])

  return { data, isLoading, error }
}
