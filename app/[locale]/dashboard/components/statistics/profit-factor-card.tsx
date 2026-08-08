'use client'

import { useData } from "@/context/data-provider"
import { WidgetSize } from '../../types/dashboard'
import { useCurrentLocale, useI18n } from '@/locales/client'
import {
  WidgetBody,
  WidgetCard,
  WidgetEmpty,
  WidgetHeader,
  WidgetMetric,
  formatRatio,
  isCompactSize,
  widgetMetricClass,
} from "../widgets"

interface ProfitFactorCardProps {
  size?: WidgetSize
}

export default function ProfitFactorCard({ size = 'medium' }: ProfitFactorCardProps) {
  const { statistics: { profitFactor, nbTrades } } = useData()
  const t = useI18n()
  const locale = useCurrentLocale()

  // formatRatio renders a non-finite factor (no losses yet) as ∞ rather than
  // "Infinity" or a fabricated number.
  const value = formatRatio(profitFactor, locale)

  return (
    <WidgetCard>
      <WidgetHeader
        size={size}
        title={t('widgets.types.profitFactor')}
        description={t('widgets.profitFactor.tooltip')}
      />
      {nbTrades === 0 ? (
        <WidgetEmpty
          size={size}
          className="flex-1"
          message={t('widgets.empty.noTrades')}
        />
      ) : isCompactSize(size) ? (
        <WidgetBody size={size} className="flex items-center justify-center">
          <span className={widgetMetricClass(size)}>{value}</span>
        </WidgetBody>
      ) : (
        <WidgetBody size={size} className="flex items-center">
          <WidgetMetric
            size={size}
            label={t('statistics.performance.profitFactor')}
            value={value}
          />
        </WidgetBody>
      )}
    </WidgetCard>
  )
}
