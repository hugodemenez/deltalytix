"use client"

import * as React from "react"
import { useData } from "@/context/data-provider"
import { WidgetSize } from '@/app/[locale]/dashboard/types/dashboard'
import { useI18n } from "@/locales/client"
import { UnitFieldLoadingSkeleton } from "./chart-loading-skeleton"
import { shareConclusion } from "./chart-conclusions"
import { ChartWidgetFrame } from "./chart-widget-frame"
import {
  shouldPackUnitField,
  UnitDotField,
} from "./chart-unit-field"

interface TradeDistributionProps {
  size?: WidgetSize
}

export default function TradeDistributionChart({ size = 'medium' }: TradeDistributionProps) {
  const { statistics: { nbWin, nbLoss, nbBe, nbTrades }, isLoading } = useData()
  const t = useI18n()
  const packed = shouldPackUnitField(nbTrades)

  const groups = React.useMemo(() => [
    {
      key: "win",
      label: t('tradeDistribution.winWithCount', { count: nbWin, total: nbTrades }),
      color: 'hsl(var(--chart-win))',
      count: nbWin,
    },
    {
      key: "breakeven",
      label: t('tradeDistribution.breakevenWithCount', { count: nbBe, total: nbTrades }),
      color: 'hsl(var(--muted-foreground))',
      count: nbBe,
    },
    {
      key: "loss",
      label: t('tradeDistribution.lossWithCount', { count: nbLoss, total: nbTrades }),
      color: 'hsl(var(--chart-loss))',
      count: nbLoss,
    },
  ], [nbWin, nbLoss, nbBe, nbTrades, t])

  const conclusion = shareConclusion(nbWin, nbTrades)
  const subtitle =
    conclusion.kind === "empty"
      ? t("tradeDistribution.subtitle.empty")
      : t(
          packed
            ? "tradeDistribution.subtitle.sharePacked"
            : "tradeDistribution.subtitle.share",
          { percent: conclusion.percent },
        )

  return (
    <ChartWidgetFrame
      size={size}
      title={t('tradeDistribution.title')}
      subtitle={subtitle}
      description={t('tradeDistribution.description')}
    >
      {isLoading ? (
        <UnitFieldLoadingSkeleton size={size} />
      ) : (
        <UnitDotField
          groups={groups}
          mode={packed ? "percent" : "record"}
          label={subtitle}
          size={size}
        />
      )}
    </ChartWidgetFrame>
  )
}
