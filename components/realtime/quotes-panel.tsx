/**
 * QuotesPanel — панель котировок
 * Таблица тикеров с текущей ценой, изменением и P&L
 *
 * Использование:
 *   <QuotesPanel symbols={['ES', 'NQ', 'MNQ', 'CL']} />
 */
'use client'

import { useRealtimeQuotes } from '@/hooks/use-realtime-quotes'
import { cn } from '@/lib/utils'
import { RefreshCw, Wifi } from 'lucide-react'

interface QuotesPanelProps {
  symbols: string[]
  className?: string
}

export function QuotesPanel({ symbols, className }: QuotesPanelProps) {
  const { quotes, isLoading, lastUpdated, refresh, error } = useRealtimeQuotes(symbols)

  const fmt = (n: number, decimals = 2) =>
    n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

  return (
    <div className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Wifi className="h-4 w-4 text-emerald-500" />
          <h3 className="text-sm font-semibold">Live Quotes</h3>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              {lastUpdated.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button
            onClick={refresh}
            disabled={isLoading}
            className="rounded p-1 hover:bg-muted transition-colors disabled:opacity-50"
            aria-label="Обновить котировки"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

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
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Symbol</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Price</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Change</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Change %</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">High</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Low</th>
            </tr>
          </thead>
          <tbody>
            {symbols.map((symbol) => {
              const q = quotes[symbol]
              const isPos = q ? q.change >= 0 : true
              return (
                <tr key={symbol} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5">
                    <span className="font-mono font-semibold text-xs">{symbol}</span>
                  </td>
                  {q ? (
                    <>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                        {fmt(q.price)}
                      </td>
                      <td className={cn(
                        'px-4 py-2.5 text-right font-mono tabular-nums text-xs',
                        isPos ? 'text-emerald-500' : 'text-red-500'
                      )}>
                        {isPos ? '+' : ''}{fmt(q.change)}
                      </td>
                      <td className={cn(
                        'px-4 py-2.5 text-right font-mono tabular-nums text-xs',
                        isPos ? 'text-emerald-500' : 'text-red-500'
                      )}>
                        {isPos ? '+' : ''}{fmt(q.changePercent)}%
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-xs text-muted-foreground">
                        {fmt(q.high)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-xs text-muted-foreground">
                        {fmt(q.low)}
                      </td>
                    </>
                  ) : (
                    <td colSpan={5} className="px-4 py-2.5 text-center">
                      <span className="inline-flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className="h-3 w-12 animate-pulse rounded bg-muted" />
                        ))}
                      </span>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t">
        <p className="text-xs text-muted-foreground">
          Данные: Finnhub · Обновление каждые 15 сек
        </p>
      </div>
    </div>
  )
}
