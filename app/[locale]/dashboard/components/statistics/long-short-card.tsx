'use client'

import { useData } from '@/context/data-provider'
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

interface LongShortPerformanceCardProps {
  size?: WidgetSize
}

export default function LongShortPerformanceCard({ size = 'medium' }: LongShortPerformanceCardProps) {
  const { calendarData } = useData()
  const t = useI18n()
  const locale = useCurrentLocale()

  // Calculate long/short data
  const chartData = Object.entries(calendarData).map(([date, values]) => ({
    date,
    pnl: values.pnl,
    shortNumber: values.shortNumber,
    longNumber: values.longNumber,
  }))

  const longNumber = chartData.reduce((acc, curr) => acc + curr.longNumber, 0)
  const shortNumber = chartData.reduce((acc, curr) => acc + curr.shortNumber, 0)
  const totalTrades = longNumber + shortNumber
  // Guarded: an empty dataset used to divide by zero and render "NaN%".
  const longRate = totalTrades > 0 ? (longNumber / totalTrades) * 100 : 0
  const shortRate = totalTrades > 0 ? (shortNumber / totalTrades) * 100 : 0

  const rows = [
    { label: t('statistics.distribution.long'), value: formatPercent(longRate, locale) },
    { label: t('statistics.distribution.short'), value: formatPercent(shortRate, locale) },
  ]

  return (
    <WidgetCard>
      <WidgetHeader
        size={size}
        title={t('widgets.types.longShortPerformance')}
        description={t('widgets.longShortPerformance.tooltip')}
      />
      {totalTrades === 0 ? (
        <WidgetEmpty
          size={size}
          className="flex-1"
          message={t('widgets.empty.noTrades')}
        />
      ) : isCompactSize(size) ? (
        <WidgetBody
          size={size}
          className="flex items-baseline justify-center gap-x-4 overflow-hidden"
        >
          {rows.map((row) => (
            <div key={row.label} className="flex min-w-0 items-baseline gap-1.5">
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
