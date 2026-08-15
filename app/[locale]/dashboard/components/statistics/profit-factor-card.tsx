import { useData } from "@/context/data-provider"
import { WidgetSize } from '../../types/dashboard'
import { useI18n } from '@/locales/client'
import { KpiCard } from './kpi-card'

interface ProfitFactorCardProps {
  size?: WidgetSize
}

export default function ProfitFactorCard(_props: ProfitFactorCardProps) {
  void _props
  const { statistics: { profitFactor } } = useData()
  const  t  = useI18n()

  return (
    <KpiCard
      title={t('widgets.types.profitFactor')}
      value={profitFactor.toFixed(2)}
      tooltip={t('widgets.profitFactor.tooltip')}
    />
  )
}
