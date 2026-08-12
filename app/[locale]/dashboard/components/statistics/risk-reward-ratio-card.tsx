'use client'

import { useData } from "@/context/data-provider"
import { WidgetSize } from '../../types/dashboard'
import { useI18n } from '@/locales/client'
import { useMemo } from "react"
import { KpiCard } from './kpi-card'

interface RiskRewardRatioCardProps {
  size?: WidgetSize
}

export default function RiskRewardRatioCard(_props: RiskRewardRatioCardProps) {
  void _props
  const { formattedTrades } = useData()
  const t = useI18n()
  
  const riskRewardRatio = useMemo(() => {
    // Filter winning and losing trades
    const winningTrades = formattedTrades.filter(trade => trade.pnl > 0)
    const losingTrades = formattedTrades.filter(trade => trade.pnl < 0)

    // Calculate averages
    const avgWin = winningTrades.length > 0
      ? winningTrades.reduce((sum, trade) => sum + trade.pnl, 0) / winningTrades.length
      : 0

    const avgLoss = losingTrades.length > 0
      ? losingTrades.reduce((sum, trade) => sum + trade.pnl, 0) / losingTrades.length
      : 0

    // Calculate Risk-Reward ratio
    const riskRewardRatio = Math.abs(avgLoss) > 0 
      ? Number((avgWin / Math.abs(avgLoss)).toFixed(2)) 
      : 0
    
    return riskRewardRatio
  }, [formattedTrades])

  return (
    <KpiCard
      title={t('widgets.types.riskRewardRatio')}
      value={riskRewardRatio.toFixed(2)}
      tooltip={t('widgets.riskRewardRatio.tooltip')}
    />
  )
}
