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
  WidgetMetric,
  formatCurrency,
  isCompactSize,
  pnlTone,
  pnlToneClass,
  widgetMetricClass,
} from "../widgets"

interface CumulativePnlCardProps {
  size?: WidgetSize
}

export default function CumulativePnlCard({ size = 'medium' }: CumulativePnlCardProps) {
  const { statistics: { cumulativePnl, cumulativeFees, nbTrades } } = useData()
  const t = useI18n()
  const locale = useCurrentLocale()

  const totalPnl = cumulativePnl - cumulativeFees
  const toneClassName = pnlToneClass(pnlTone(totalPnl))
  // The sign stays on the number, so the tone color is never the only signal.
  const value = formatCurrency(totalPnl, locale)

  return (
    <WidgetCard>
      <WidgetHeader
        size={size}
        title={t('widgets.types.cumulativePnl')}
        description={t('widgets.cumulativePnl.tooltip')}
      />
      {nbTrades === 0 ? (
        <WidgetEmpty
          size={size}
          className="flex-1"
          message={t('widgets.empty.noTrades')}
        />
      ) : isCompactSize(size) ? (
        <WidgetBody size={size} className="flex items-center justify-center">
          <span className={cn(widgetMetricClass(size), toneClassName)}>{value}</span>
        </WidgetBody>
      ) : (
        <WidgetBody size={size} className="flex items-center">
          <WidgetMetric
            size={size}
            label={t('statistics.profitLoss.net')}
            value={value}
            toneClassName={toneClassName}
          />
        </WidgetBody>
      )}
    </WidgetCard>
  )
}
