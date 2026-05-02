'use client'

import { cn } from '@/lib/utils'
import type { BehavioralPatternDetection } from '@/lib/behavioral-analytics'

interface BehavioralAlertCardProps {
  item: BehavioralPatternDetection
}

const severityClasses = {
  LOW: 'border-yellow-500/30 bg-yellow-500/5',
  MEDIUM: 'border-orange-500/30 bg-orange-500/5',
  HIGH: 'border-red-500/30 bg-red-500/5',
}

export function BehavioralAlertCard({ item }: BehavioralAlertCardProps) {
  return (
    <div className={cn('rounded-xl border p-4 shadow-sm', severityClasses[item.severity])}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{item.title}</p>
          <p className="text-xs text-muted-foreground">{item.type.replaceAll('_', ' ')}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Score</p>
          <p className="text-sm font-semibold tabular-nums">{item.score}</p>
        </div>
      </div>

      <p className="mb-3 text-sm text-muted-foreground">{item.description}</p>

      <div className="grid grid-cols-3 gap-3 text-xs">
        <div>
          <p className="text-muted-foreground">Severity</p>
          <p className="font-medium">{item.severity}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Confidence</p>
          <p className="font-medium">{Math.round(item.confidence * 100)}%</p>
        </div>
        <div>
          <p className="text-muted-foreground">Est. loss</p>
          <p className="font-medium tabular-nums text-red-500">
            ${item.estimatedLoss.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>
    </div>
  )
}
