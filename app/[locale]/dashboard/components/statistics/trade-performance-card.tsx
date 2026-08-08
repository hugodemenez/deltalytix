'use client'

import { useData } from "@/context/data-provider"
import { cn } from "@/lib/utils"
import { WidgetSize } from '../../types/dashboard'
import { useCurrentLocale, useI18n } from '@/locales/client'
import {
  WidgetBody,
  WidgetCard,
  WidgetEmpty,
  WidgetHeader,
  WidgetStat,
  WidgetStatList,
  formatPercent,
  isCompactSize,
  widgetType,
} from "../widgets"

interface TradePerformanceCardProps {
  size?: WidgetSize
}

export default function TradePerformanceCard({ size = 'medium' }: TradePerformanceCardProps) {
  const { statistics: { nbWin, nbLoss, nbBe, nbTrades } } = useData()
  const t = useI18n()
  const locale = useCurrentLocale()

  // Guarded: an empty dataset used to divide by zero and render "NaN%".
  const winRate = nbTrades > 0 ? (nbWin / nbTrades) * 100 : 0
  const lossRate = nbTrades > 0 ? (nbLoss / nbTrades) * 100 : 0
  const beRate = nbTrades > 0 ? (nbBe / nbTrades) * 100 : 0

  // Win/breakeven/loss is a distribution, not a signed P&L, so it stays
  // monochrome: the labels carry the meaning, not the color.
  const rows = [
    { label: t('statistics.performance.win'), value: formatPercent(winRate, locale) },
    { label: t('statistics.activity.breakeven'), value: formatPercent(beRate, locale) },
    { label: t('statistics.performance.loss'), value: formatPercent(lossRate, locale) },
  ]

  return (
    <WidgetCard>
      <WidgetHeader
        size={size}
        title={t('widgets.types.tradePerformance')}
        description={t('widgets.tradePerformance.tooltip')}
      />
      {nbTrades === 0 ? (
        <WidgetEmpty
          size={size}
          className="flex-1"
          message={t('widgets.empty.noTrades')}
        />
      ) : isCompactSize(size) ? (
        <WidgetBody
          size={size}
          className="flex items-baseline justify-center gap-x-3 overflow-hidden"
        >
          {rows.map((row) => (
            <div key={row.label} className="flex min-w-0 items-baseline gap-1">
              <span className={cn(widgetType.label, "truncate")}>{row.label}</span>
              <span className={cn(widgetType.value, "shrink-0")}>{row.value}</span>
            </div>
          ))}
        </WidgetBody>
      ) : (
        <WidgetBody size={size}>
          <WidgetStatList>
            {rows.map((row) => (
              <WidgetStat key={row.label} label={row.label} value={row.value} />
            ))}
          </WidgetStatList>
        </WidgetBody>
      )}
    </WidgetCard>
  )
}
