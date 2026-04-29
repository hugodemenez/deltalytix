import useSWR from 'swr'
import type { PeriodRange, PerformanceData } from '@/lib/performance/types'

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error('Failed to fetch performance data')
  return r.json() as Promise<PerformanceData>
})

export function usePerformanceData(period: PeriodRange) {
  const params = new URLSearchParams({
    type:   period.type,
    offset: String(period.offset),
    ...(period.from ? { from: period.from } : {}),
    ...(period.to   ? { to:   period.to   } : {}),
  })
  const key = `/api/performance?${params}`

  const { data, error, isLoading } = useSWR<PerformanceData>(key, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval:  60_000,
  })

  return { data, error, isLoading }
}
