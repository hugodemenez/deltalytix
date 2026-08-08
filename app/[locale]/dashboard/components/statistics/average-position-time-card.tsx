'use client'

import { useData } from "@/context/data-provider"
import { WidgetSize } from '../../types/dashboard'
import { useI18n } from '@/locales/client'
import {
  WidgetBody,
  WidgetCard,
  WidgetEmpty,
  WidgetHeader,
  WidgetMetric,
  formatDuration,
  isCompactSize,
  widgetMetricClass,
} from "../widgets"

interface AveragePositionTimeCardProps {
  size?: WidgetSize
}

export default function AveragePositionTimeCard({ size = 'medium' }: AveragePositionTimeCardProps) {
  const { statistics: { totalPositionTime, nbTrades } } = useData()
  const t = useI18n()

  // Same quantity the statistics layer derives, rendered through the shared
  // duration formatter so precision matches every other duration on the board.
  const averageSeconds = nbTrades > 0 ? totalPositionTime / nbTrades : 0
  const value = formatDuration(averageSeconds)

  return (
    <WidgetCard>
      <WidgetHeader
        size={size}
        title={t('widgets.types.averagePositionTime')}
        description={t('widgets.averagePositionTime.tooltip')}
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
            label={t('statistics.activity.avgDuration')}
            value={value}
          />
        </WidgetBody>
      )}
    </WidgetCard>
  )
}
