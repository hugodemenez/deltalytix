'use client'

import { useData } from "@/context/data-provider"
import { WidgetSize } from '../../types/dashboard'
import { useI18n } from '@/locales/client'
import { KpiCard } from './kpi-card'

interface TradePerformanceCardProps {
  size?: WidgetSize
}

export default function TradePerformanceCard(_props: TradePerformanceCardProps) {
  void _props
  const { statistics: { nbWin, nbLoss, nbBe, nbTrades } } = useData()
  const t = useI18n()

  // Calculate rates
  const winRate = Number((nbWin / nbTrades * 100).toFixed(2))
  const lossRate = Number((nbLoss / nbTrades * 100).toFixed(2))
  const beRate = Number((nbBe / nbTrades * 100).toFixed(2))

  return (
    <KpiCard
      title={t('widgets.types.tradePerformance')}
      value={`${winRate}% / ${beRate}% / ${lossRate}%`}
      tooltip={t('widgets.tradePerformance.tooltip')}
    />
  )
}
