'use client'

import { useData } from "@/context/data-provider"
import { WidgetSize } from '../../types/dashboard'
import { useCurrentLocale, useI18n } from '@/locales/client'
import { useMemo } from "react"
import {
  WidgetBody,
  WidgetCard,
  WidgetEmpty,
  WidgetHeader,
  WidgetMetric,
  WidgetStat,
  WidgetStatList,
  formatCurrency,
  formatRatio,
  isCompactSize,
  pnlTone,
  pnlToneClass,
  widgetMetricClass,
} from "../widgets"

interface RiskRewardRatioCardProps {
  size?: WidgetSize
}

export default function RiskRewardRatioCard({ size = 'tiny' }: RiskRewardRatioCardProps) {
  const { formattedTrades } = useData()
  const t = useI18n()
  const locale = useCurrentLocale()

  const { avgWin, avgLoss, riskRewardRatio } = useMemo(() => {
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
      ? avgWin / Math.abs(avgLoss)
      : 0

    return { avgWin, avgLoss, riskRewardRatio }
  }, [formattedTrades])

  const ratio = formatRatio(riskRewardRatio, locale)

  return (
    <WidgetCard>
      <WidgetHeader
        size={size}
        title={t('widgets.types.riskRewardRatio')}
        description={t('widgets.riskRewardRatio.tooltip')}
      />
      {formattedTrades.length === 0 ? (
        <WidgetEmpty
          size={size}
          className="flex-1"
          message={t('widgets.empty.noTrades')}
        />
      ) : isCompactSize(size) ? (
        <WidgetBody size={size} className="flex items-center justify-center">
          <span className={widgetMetricClass(size)}>{ratio}</span>
        </WidgetBody>
      ) : (
        <WidgetBody size={size} className="flex flex-col gap-4">
          <WidgetMetric
            size={size}
            label={t('widgets.types.riskRewardRatio')}
            value={ratio}
          />
          {/* Averages the ratio is built from: evidence beside the claim, not
              hidden behind a hover tooltip. */}
          <WidgetStatList>
            <WidgetStat
              label={t('statistics.performance.avgWin')}
              value={formatCurrency(avgWin, locale)}
              toneClassName={pnlToneClass(pnlTone(avgWin))}
            />
            <WidgetStat
              label={t('statistics.performance.avgLoss')}
              value={formatCurrency(avgLoss, locale)}
              toneClassName={pnlToneClass(pnlTone(avgLoss))}
            />
          </WidgetStatList>
        </WidgetBody>
      )}
    </WidgetCard>
  )
}
