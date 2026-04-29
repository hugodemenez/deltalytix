'use client'

import { useEffect, useState } from 'react'
import type { BehavioralPatternDetection } from '@/lib/behavioral-analytics'

interface BehavioralAnalyticsResponse {
  detections: BehavioralPatternDetection[]
  summary: {
    count: number
    estimatedLoss: number
    byType: Record<string, number>
  }
}

export function useBehavioralAnalytics(params: {
  userId?: string
  accountNumber?: string
  limit?: number
}) {
  const [data, setData] = useState<BehavioralAnalyticsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!params.userId) return

    const controller = new AbortController()

    async function run() {
      try {
        setIsLoading(true)
        setError(null)

        const query = new URLSearchParams({
          userId: params.userId!,
          ...(params.accountNumber ? { accountNumber: params.accountNumber } : {}),
          ...(params.limit ? { limit: String(params.limit) } : {}),
        })

        const res = await fetch(`/api/behavioral-analytics?${query.toString()}`, {
          signal: controller.signal,
          cache: 'no-store',
        })

        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const json: BehavioralAnalyticsResponse = await res.json()
        setData(json)
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Failed to load behavioral analytics')
      } finally {
        setIsLoading(false)
      }
    }

    run()
    return () => controller.abort()
  }, [params.userId, params.accountNumber, params.limit])

  return {
    data,
    isLoading,
    error,
  }
}
