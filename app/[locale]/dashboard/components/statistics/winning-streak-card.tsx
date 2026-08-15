import { useData } from "@/context/data-provider"
import { WidgetSize } from '../../types/dashboard'
import { useI18n } from '@/locales/client'
import { KpiCard } from './kpi-card'

interface WinningStreakCardProps {
  size?: WidgetSize
}

export default function WinningStreakCard(_props: WinningStreakCardProps) {
  void _props
  const { statistics: { winningStreak } } = useData()
  const  t  = useI18n()

  return (
    <KpiCard
      title={t('widgets.types.winningStreak')}
      value={winningStreak}
      tooltip={t('widgets.winningStreak.tooltip')}
    />
  )
}
