'use client'

/**
 * EventCorrelationPanel
 *
 * Displays a summary of how economic events correlate with trading P&L.
 * Uses computeEventCorrelation() from lib/economic-calendar.
 *
 * Intended to be placed below the main calendar widget or in a side panel.
 */

import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Minus, Calendar, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { computeEventCorrelation } from '@/lib/economic-calendar'
import type { EconomicEvent } from '@/lib/economic-calendar'
import type { CalendarData } from '@/app/[locale]/dashboard/types/calendar'

interface EventCorrelationPanelProps {
  calendarData: CalendarData
  eventsByDate: Record<string, EconomicEvent[]>
  className?:   string
  currency?:    string
}

function StatCard({
  label, value, sub, positive,
}: {
  label:    string
  value:    string
  sub?:     string
  positive: boolean | null
}) {
  const color =
    positive === null  ? 'text-foreground'
    : positive         ? 'text-emerald-500'
    :                    'text-red-500'

  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={cn('text-lg font-semibold font-mono tabular-nums', color)}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

function fmt(n: number) {
  const abs = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${n >= 0 ? '+' : '-'}$${abs}`
}

export function EventCorrelationPanel({
  calendarData,
  eventsByDate,
  className,
  currency = 'USD',
}: EventCorrelationPanelProps) {
  const stats = useMemo(
    () => computeEventCorrelation(calendarData, eventsByDate),
    [calendarData, eventsByDate]
  )

  const hasSufficientData = stats.eventDayCount >= 2 && stats.noEventDayCount >= 2

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Event Correlation</h3>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5" />
          <span>{currency} events only</span>
        </div>
      </div>

      {!hasSufficientData ? (
        <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            Not enough data to compute correlation.
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Need at least 2 event days and 2 non-event days.
          </p>
        </div>
      ) : (
        <>
          {/* KPI grid */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatCard
              label="Avg P&L — Event Days"
              value={fmt(stats.avgPnlOnEventDays)}
              sub={`${stats.eventDayCount} days`}
              positive={stats.avgPnlOnEventDays >= 0}
            />
            <StatCard
              label="Avg P&L — No-Event Days"
              value={fmt(stats.avgPnlOnNoEventDays)}
              sub={`${stats.noEventDayCount} days`}
              positive={stats.avgPnlOnNoEventDays >= 0}
            />
            <StatCard
              label="Impact Score"
              value={fmt(stats.impactScore)}
              sub="event − no-event"
              positive={
                stats.impactScore === 0 ? null : stats.impactScore > 0
              }
            />
            <div className="rounded-lg border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">Verdict</p>
              <div className="flex items-center gap-1.5 mt-1">
                {stats.impactScore > 0 ? (
                  <>
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs font-medium text-emerald-500">Trade events</span>
                  </>
                ) : stats.impactScore < 0 ? (
                  <>
                    <TrendingDown className="h-4 w-4 text-red-500" />
                    <span className="text-xs font-medium text-red-500">Avoid events</span>
                  </>
                ) : (
                  <>
                    <Minus className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">No pattern</span>
                  </>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Based on HIGH + MEDIUM</p>
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-[10px] text-muted-foreground">
            Correlation ≠ causation. Based on {stats.eventDayCount + stats.noEventDayCount} trading days.
          </p>
        </>
      )}
    </div>
  )
}
