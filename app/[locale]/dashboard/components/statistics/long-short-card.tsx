'use client'

import { useData } from '@/context/data-provider'
import { WidgetSize } from '../../types/dashboard'
import { useI18n } from '@/locales/client'
import { KpiCard } from './kpi-card'

interface LongShortPerformanceCardProps {
  size?: WidgetSize
}

export default function LongShortPerformanceCard(_props: LongShortPerformanceCardProps) {
  void _props
  const { calendarData } = useData()
  const  t  = useI18n()

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
  const longRate = Number((longNumber / totalTrades * 100).toFixed(2))
  const shortRate = Number((shortNumber / totalTrades * 100).toFixed(2))

  return (
    <KpiCard
      title={t('widgets.types.longShortPerformance')}
      value={`${longRate}% / ${shortRate}%`}
      tooltip={t('widgets.longShortPerformance.tooltip')}
    />
  )
}
