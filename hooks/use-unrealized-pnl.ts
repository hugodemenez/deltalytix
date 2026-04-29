/**
 * useUnrealizedPnL — хук для расчёта нереализованного P&L
 * по открытым позициям с учётом текущих котировок.
 *
 * Открытые позиции определяются как Trade с closeDate = текущий день
 * или через отдельную модель OpenPosition (если будет добавлена).
 *
 * Использование:
 *   const { totalUnrealized, positions } = useUnrealizedPnL(openTrades)
 */
'use client'

import { useMemo } from 'react'
import { useRealtimeQuotes } from './use-realtime-quotes'
import type { NormalizedQuote } from '@/lib/finnhub'

export interface OpenPosition {
  id: string
  instrument: string
  side: 'LONG' | 'SHORT'
  quantity: number
  entryPrice: number
  tickValue?: number  // $ за один тик (из TickDetails)
  tickSize?: number   // размер тика
}

export interface PositionWithPnL extends OpenPosition {
  currentPrice: number | null
  unrealizedPnl: number | null
  changePercent: number | null
}

export interface UseUnrealizedPnLResult {
  positions: PositionWithPnL[]
  totalUnrealized: number
  isLoading: boolean
  quotes: Record<string, NormalizedQuote>
}

export function useUnrealizedPnL(
  openPositions: OpenPosition[]
): UseUnrealizedPnLResult {
  const symbols = useMemo(
    () => [...new Set(openPositions.map((p) => p.instrument))],
    [openPositions]
  )

  const { quotes, isLoading } = useRealtimeQuotes(symbols)

  const positions = useMemo<PositionWithPnL[]>(() => {
    return openPositions.map((pos) => {
      const quote = quotes[pos.instrument]

      if (!quote) {
        return { ...pos, currentPrice: null, unrealizedPnl: null, changePercent: null }
      }

      const priceDiff =
        pos.side === 'LONG'
          ? quote.price - pos.entryPrice
          : pos.entryPrice - quote.price

      // Если есть tick details — используем их для точного расчёта
      let unrealizedPnl: number
      if (pos.tickValue && pos.tickSize) {
        const ticks = priceDiff / pos.tickSize
        unrealizedPnl = ticks * pos.tickValue * pos.quantity
      } else {
        unrealizedPnl = priceDiff * pos.quantity
      }

      const changePercent = pos.entryPrice
        ? (priceDiff / pos.entryPrice) * 100
        : 0

      return {
        ...pos,
        currentPrice: quote.price,
        unrealizedPnl,
        changePercent,
      }
    })
  }, [openPositions, quotes])

  const totalUnrealized = useMemo(
    () => positions.reduce((sum, p) => sum + (p.unrealizedPnl ?? 0), 0),
    [positions]
  )

  return { positions, totalUnrealized, isLoading, quotes }
}
