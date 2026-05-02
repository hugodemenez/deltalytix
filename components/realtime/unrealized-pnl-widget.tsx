/**
 * UnrealizedPnLWidget — виджет в шапке дашборда
 * Показывает суммарный нереализованный P&L по открытым позициям
 *
 * Использование (в header/navbar):
 *   <UnrealizedPnLWidget openPositions={positions} />
 */
'use client'

import { useUnrealizedPnL } from '@/hooks/use-unrealized-pnl'
import type { OpenPosition } from '@/hooks/use-unrealized-pnl'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'

interface UnrealizedPnLWidgetProps {
  openPositions: OpenPosition[]
  className?: string
}

export function UnrealizedPnLWidget({
  openPositions,
  className,
}: UnrealizedPnLWidgetProps) {
  const { totalUnrealized, positions, isLoading } = useUnrealizedPnL(openPositions)

  if (!openPositions.length) return null

  const isPositive = totalUnrealized >= 0
  const Icon = isPositive ? TrendingUp : TrendingDown

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      signDisplay: 'always',
      minimumFractionDigits: 2,
    }).format(n)

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm',
        'bg-background/80 backdrop-blur-sm',
        isPositive ? 'border-emerald-500/30' : 'border-red-500/30',
        className
      )}
      title={`Открытые позиции: ${positions.length}`}
    >
      {isLoading ? (
        <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
      ) : (
        <Icon
          className={cn(
            'h-3.5 w-3.5',
            isPositive ? 'text-emerald-500' : 'text-red-500'
          )}
        />
      )}

      <span className="text-xs text-muted-foreground">Unrealized</span>

      <span
        className={cn(
          'font-semibold tabular-nums',
          isPositive ? 'text-emerald-500' : 'text-red-500'
        )}
      >
        {fmt(totalUnrealized)}
      </span>

      {/* Детализация по позициям (tooltip-like) */}
      <span className="text-xs text-muted-foreground">
        ({positions.length} pos)
      </span>
    </div>
  )
}
