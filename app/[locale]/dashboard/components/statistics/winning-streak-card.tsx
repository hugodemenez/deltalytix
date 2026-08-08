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
  formatCount,
  isCompactSize,
  widgetMetricClass,
} from "../widgets"

interface WinningStreakCardProps {
  size?: WidgetSize
}

export default function WinningStreakCard({ size = 'medium' }: WinningStreakCardProps) {
  const { statistics: { winningStreak, nbTrades } } = useData()
  const t = useI18n()
  const locale = useCurrentLocale()

  const value = formatCount(winningStreak, locale)

  return (
    <WidgetCard>
      <WidgetHeader
        size={size}
        title={t('widgets.types.winningStreak')}
        description={t('widgets.winningStreak.tooltip')}
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
            label={t('statistics.distribution.winningStreak')}
            value={value}
          />
        </WidgetBody>
      )}
    </WidgetCard>
  )
}
