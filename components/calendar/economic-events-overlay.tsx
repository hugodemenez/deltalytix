'use client'

/**
 * EconomicEventsOverlay
 *
 * Renders small impact-coloured pins inside a calendar day cell.
 * Designed to be composited on top of the existing desktop/mobile calendar cells.
 *
 * Usage:
 *   <EconomicEventsOverlay events={byDate[dateStr] ?? []} />
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { EconomicEvent, EventImpact } from '@/lib/economic-calendar'
import { EventDetailPopover } from './event-detail-popover'

const IMPACT_COLOR: Record<EventImpact, string> = {
  HIGH:    'bg-red-500',
  MEDIUM:  'bg-amber-400',
  LOW:     'bg-sky-400',
  UNKNOWN: 'bg-muted-foreground/40',
}

const IMPACT_LABEL: Record<EventImpact, string> = {
  HIGH:    'High impact',
  MEDIUM:  'Medium impact',
  LOW:     'Low impact',
  UNKNOWN: 'Unknown impact',
}

interface EconomicEventsOverlayProps {
  events:     EconomicEvent[]
  maxVisible?: number
  className?: string
}

export function EconomicEventsOverlay({
  events,
  maxVisible = 3,
  className,
}: EconomicEventsOverlayProps) {
  const [selected, setSelected] = useState<EconomicEvent | null>(null)

  if (!events.length) return null

  // Sort HIGH → MEDIUM → LOW, then slice
  const sorted = [...events].sort((a, b) => {
    const rank: Record<EventImpact, number> = { HIGH: 3, MEDIUM: 2, LOW: 1, UNKNOWN: 0 }
    return rank[b.impact] - rank[a.impact]
  })

  const visible  = sorted.slice(0, maxVisible)
  const overflow = sorted.length - maxVisible

  return (
    <>
      <div className={cn('flex items-center gap-0.5 flex-wrap', className)}>
        {visible.map((ev) => (
          <button
            key={ev.id}
            onClick={(e) => { e.stopPropagation(); setSelected(ev) }}
            className={cn(
              'h-1.5 w-1.5 rounded-full transition-transform hover:scale-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              IMPACT_COLOR[ev.impact]
            )}
            aria-label={`${ev.event} — ${IMPACT_LABEL[ev.impact]}`}
            title={`${ev.event} (${ev.time ?? 'all-day'})`}
          />
        ))}
        {overflow > 0 && (
          <span className="text-[9px] leading-none text-muted-foreground ml-0.5">
            +{overflow}
          </span>
        )}
      </div>

      {selected && (
        <EventDetailPopover
          event={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}
