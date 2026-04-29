'use client'

import { BehavioralAlertCard } from '@/components/behavioral/behavioral-alert-card'
import { useBehavioralAnalytics } from '@/hooks/use-behavioral-analytics'

interface BehavioralAlertsPanelProps {
  userId: string
  accountNumber?: string
}

export function BehavioralAlertsPanel({ userId, accountNumber }: BehavioralAlertsPanelProps) {
  const { data, isLoading, error } = useBehavioralAnalytics({
    userId,
    accountNumber,
    limit: 300,
  })

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-44 animate-pulse rounded-xl border bg-muted/40" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-500">
        Failed to load behavioral analytics: {error}
      </div>
    )
  }

  if (!data || !data.detections.length) {
    return (
      <div className="rounded-xl border p-6 text-sm text-muted-foreground">
        No behavioral risk patterns detected for the selected scope.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Detections</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{data.summary.count}</p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Estimated loss</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-red-500">
            ${data.summary.estimatedLoss.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Top pattern</p>
          <p className="mt-1 text-sm font-semibold">
            {Object.entries(data.summary.byType).sort((a, b) => b[1] - a[1])[0]?.[0]?.replaceAll('_', ' ') ?? '—'}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.detections.map((item) => (
          <BehavioralAlertCard key={`${item.type}-${item.tradeIds.join('-')}`} item={item} />
        ))}
      </div>
    </div>
  )
}
