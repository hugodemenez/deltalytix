/**
 * QuoteBadge — inline-значок с ценой и изменением для тикера
 *
 * Использование:
 *   <QuoteBadge symbol="ES" />
 *   <QuoteBadge symbol="NQ" showChange />
 */
'use client'

import { useRealtimeQuotes } from '@/hooks/use-realtime-quotes'
import { cn } from '@/lib/utils'

interface QuoteBadgeProps {
  symbol: string
  showChange?: boolean
  className?: string
}

export function QuoteBadge({ symbol, showChange = false, className }: QuoteBadgeProps) {
  const { quotes, isLoading } = useRealtimeQuotes([symbol])
  const quote = quotes[symbol]

  if (isLoading && !quote) {
    return (
      <span className={cn('inline-flex items-center gap-1 text-xs text-muted-foreground', className)}>
        <span className="h-3 w-12 animate-pulse rounded bg-muted" />
      </span>
    )
  }

  if (!quote) return null

  const isPositive = quote.change >= 0

  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium tabular-nums', className)}>
      <span>${quote.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      {showChange && (
        <span className={cn(
          'text-[11px]',
          isPositive ? 'text-emerald-500' : 'text-red-500'
        )}>
          {isPositive ? '+' : ''}{quote.changePercent.toFixed(2)}%
        </span>
      )}
    </span>
  )
}
