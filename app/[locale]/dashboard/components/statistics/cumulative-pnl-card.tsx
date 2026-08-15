import { useData } from "@/context/data-provider"
import { cn } from "@/lib/utils"
import { WidgetSize } from '../../types/dashboard'
import { useCurrentLocale, useI18n } from '@/locales/client'
import { KpiCard } from './kpi-card'

interface CumulativePnlCardProps {
  size?: WidgetSize
}

export default function CumulativePnlCard(_props: CumulativePnlCardProps) {
  void _props
  const { statistics: { cumulativePnl, cumulativeFees } } = useData()
  const totalPnl = cumulativePnl - cumulativeFees
  const isPositive = totalPnl > 0
  const isNegative = totalPnl < 0
  const t = useI18n()
  const locale = useCurrentLocale()
  const amount = new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(totalPnl))
  const signedAmount = `${isPositive ? '+' : isNegative ? '-' : ''}$${amount}`

  return (
    <KpiCard
      title={t('widgets.types.cumulativePnl')}
      value={signedAmount}
      valueClassName={cn(
        isPositive && 'text-[#3E7550]',
        isNegative && 'text-[#B55742]'
      )}
      tooltip={t('widgets.cumulativePnl.tooltip')}
    />
  )
}
