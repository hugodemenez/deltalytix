'use client'

/**
 * EventDetailPopover
 *
 * Shows full details for a single economic event.
 * Displayed when user clicks an event pin in EconomicEventsOverlay.
 */

import { useEffect, useRef } from 'react'
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EconomicEvent, EventImpact } from '@/lib/economic-calendar'

const IMPACT_CONFIG: Record<EventImpact, { label: string; dot: string; badge: string }> = {
  HIGH:    { label: 'High',    dot: 'bg-red-500',    badge: 'bg-red-50    text-red-700    dark:bg-red-950/40    dark:text-red-400' },
  MEDIUM:  { label: 'Medium', dot: 'bg-amber-400',  badge: 'bg-amber-50  text-amber-700  dark:bg-amber-950/40  dark:text-amber-400' },
  LOW:     { label: 'Low',    dot: 'bg-sky-400',    badge: 'bg-sky-50    text-sky-700    dark:bg-sky-950/40    dark:text-sky-400' },
  UNKNOWN: { label: '—',      dot: 'bg-muted',      badge: 'bg-muted     text-muted-foreground' },
}

function SurpriseIcon({ actual, forecast }: { actual: string | null; forecast: string | null }) {
  if (!actual || !forecast) return <Minus className="h-3.5 w-3.5 text-muted-foreground" />
  const a = parseFloat(actual.replace(/[^0-9.-]/g, ''))
  const f = parseFloat(forecast.replace(/[^0-9.-]/g, ''))
  if (isNaN(a) || isNaN(f)) return <Minus className="h-3.5 w-3.5 text-muted-foreground" />
  if (a > f) return <TrendingUp  className="h-3.5 w-3.5 text-emerald-500" />
  if (a < f) return <TrendingDown className="h-3.5 w-3.5 text-red-500" />
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />
}

interface EventDetailPopoverProps {
  event:   EconomicEvent
  onClose: () => void
}

export function EventDetailPopover({ event, onClose }: EventDetailPopoverProps) {
  const ref = useRef<HTMLDivElement>(null)
  const cfg = IMPACT_CONFIG[event.impact]

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[1px]"
      aria-modal="true"
      role="dialog"
      aria-label={event.event}
    >
      <div
        ref={ref}
        className="relative w-80 rounded-xl border bg-card shadow-lg p-4 text-sm"
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 rounded p-1 hover:bg-muted transition-colors"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-2 pr-6 mb-3">
          <span className={cn('mt-0.5 h-2 w-2 shrink-0 rounded-full', cfg.dot)} />
          <div>
            <p className="font-semibold leading-snug">{event.event}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {event.country} · {event.currency}
              {event.time ? ` · ${event.time} UTC` : ' · All day'}
            </p>
          </div>
        </div>

        {/* Impact badge */}
        <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full mb-3', cfg.badge)}>
          {cfg.label} impact
        </span>

        {/* Data grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: 'Actual',   value: event.actual,   highlight: true },
            { label: 'Forecast', value: event.forecast, highlight: false },
            { label: 'Previous', value: event.previous, highlight: false },
          ].map(({ label, value, highlight }) => (
            <div key={label} className="rounded-lg bg-muted/40 px-2 py-2">
              <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
              <p className={cn(
                'font-mono font-semibold text-xs',
                highlight && value ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {value ? `${value}${event.unit ?? ''}` : '—'}
              </p>
            </div>
          ))}
        </div>

        {/* Surprise indicator */}
        {(event.actual || event.forecast) && (
          <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
            <SurpriseIcon actual={event.actual} forecast={event.forecast} />
            <span>
              {event.actual && event.forecast
                ? parseFloat(event.actual.replace(/[^0-9.-]/g, '')) >
                  parseFloat(event.forecast.replace(/[^0-9.-]/g, ''))
                  ? 'Beat forecast'
                  : parseFloat(event.actual.replace(/[^0-9.-]/g, '')) <
                    parseFloat(event.forecast.replace(/[^0-9.-]/g, ''))
                  ? 'Missed forecast'
                  : 'In line with forecast'
                : 'No forecast available'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
