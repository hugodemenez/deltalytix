'use client'

import { useRealtimeQuotes } from '@/hooks/use-realtime-quotes'
import { cn } from '@/lib/utils'
import { RefreshCw, Wifi, WifiOff, Minus } from 'lucide-react'
import type { MarketStatus } from '@/lib/finnhub'

interface QuotesPanelProps {
  symbols:   string[]
  className?: string
}

const MarketStatusBadge = ({ status }: { status: MarketStatus }) => {
  const config = {
    OPEN:    { label: 'Market Open',   icon: Wifi,    color: 'text-emerald-500' },
    CLOSED:  { label: 'Market Closed', icon: WifiOff, color: 'text-muted-foreground' },
    UNKNOWN: { label: 'Status Unknown', icon: Minus,  color: 'text-muted-foreground' },
  }[status]

  const Icon = config.icon

  return (
    <span className={cn('inline-flex items-center gap-1 text-xs', config.color)}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  )
}

export function QuotesPanel({ symbols, className }: QuotesPanelProps) {
  const { quotes, marketStatus, isLoading, lastUpdated, refresh, error } =
    useRealtimeQuotes(symbols)

  const fmt = (n: number | null, decimals = 2) =>
    n === null
      ? '—'
      : n.toLocaleString('en-US', {
          minimumFractionDigits:  decimals,
          maximumFractionDigits:  decimals,
        })

  return (
    <div className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">Live Quotes</span>
          <MarketStatusBadge status={marketStatus} />
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              {lastUpdated.toLocaleTimeString([], {
                hour:   '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
          )}
          <button
            onClick={refresh}
            disabled={isLoading}
            className="rounded p-1 hover:bg-muted transition-colors disabled:opacity-50"
            aria-label="Refresh quotes"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Market closed notice */}
      {marketStatus === 'CLOSED' && (
        <div className="px-4 py-2 text-xs text-muted-foreground bg-muted/30 border-b">
          Market is currently closed. Showing last available prices.
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 py-2 text-xs text-red-500 bg-red-50 dark:bg-red-950/20">
          ⚠️ {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              {['Symbol', 'Price', 'Change', 'Change %', 'High', 'Low'].map((h) => (
                <th
                  key={h}
                  className={cn(
                    'px-4 py-2 text-xs font-medium text-muted-foreground',
                    h === 'Symbol' ? 'text-left' : 'text-right'
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {symbols.map((symbol) => {
              const q      = quotes[symbol]
              const price  = q?.price ?? null
              const change = q && 'change' in q && q.change !== null ? q.change : null
              const cp     = q && 'changePercent' in q && q.changePercent !== null
                ? q.changePercent
                : null
              const high   = q && 'high' in q ? (q as { high?: number }).high ?? null : null
              const low    = q && 'low' in q  ? (q as { low?:  number }).low  ?? null : null
              const isPos  = (change ?? 0) >= 0

              return (
                <tr
                  key={symbol}
                  className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                >
                  <td className="px-4 py-2.5">
                    <span className="font-mono font-semibold text-xs">{symbol}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                    {isLoading && !price ? (
                      <span className="inline-block h-3 w-16 animate-pulse rounded bg-muted" />
                    ) : (
                      fmt(price)
                    )}
                  </td>
                  <td
                    className={cn(
                      'px-4 py-2.5 text-right font-mono tabular-nums text-xs',
                      change === null
                        ? 'text-muted-foreground'
                        : isPos
                        ? 'text-emerald-500'
                        : 'text-red-500'
                    )}
                  >
                    {change !== null ? `${isPos ? '+' : ''}${fmt(change)}` : '—'}
                  </td>
                  <td
                    className={cn(
                      'px-4 py-2.5 text-right font-mono tabular-nums text-xs',
                      cp === null
                        ? 'text-muted-foreground'
                        : isPos
                        ? 'text-emerald-500'
                        : 'text-red-500'
                    )}
                  >
                    {cp !== null ? `${isPos ? '+' : ''}${fmt(cp)}%` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-xs text-muted-foreground">
                    {fmt(high)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-xs text-muted-foreground">
                    {fmt(low)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t">
        <p className="text-xs text-muted-foreground">
          Data: Finnhub
          {marketStatus === 'OPEN' ? ' · Updates every 15s' : ' · Updates every 60s'}
        </p>
      </div>
    </div>
  )
}
