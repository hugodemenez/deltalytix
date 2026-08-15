import { useData } from "@/context/data-provider"
import { WidgetSize } from '../../types/dashboard'
import { useI18n } from '@/locales/client'
import { KpiCard } from './kpi-card'

interface AveragePositionTimeCardProps {
  size?: WidgetSize
}

export default function AveragePositionTimeCard(_props: AveragePositionTimeCardProps) {
  void _props
  const { statistics: { averagePositionTime } } = useData()
  const  t  = useI18n()

  return (
    <KpiCard
      title={t('widgets.types.averagePositionTime')}
      value={averagePositionTime}
      tooltip={t('widgets.averagePositionTime.tooltip')}
    />
  )
}
