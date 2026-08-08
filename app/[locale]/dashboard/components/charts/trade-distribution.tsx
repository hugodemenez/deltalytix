"use client"

import * as React from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Label } from "recharts"
import type { Props } from 'recharts/types/component/Label'
import type { PolarViewBox } from 'recharts/types/util/types'
import { useData } from "@/context/data-provider"
import { cn } from "@/lib/utils"
import { WidgetSize } from '@/app/[locale]/dashboard/types/dashboard'
import { useCurrentLocale, useI18n } from "@/locales/client"
import {
  chartColors,
  chartTickFontSize,
  formatCount,
  formatPercent,
  isCompactSize,
  WidgetBody,
  WidgetCard,
  WidgetChartLegend,
  WidgetEmpty,
  WidgetHeader,
  WidgetTooltip,
} from "../widgets"
import { DonutChartLoadingSkeleton } from "./chart-loading-skeleton"

interface TradeDistributionProps {
  size?: WidgetSize
}

interface ChartDataPoint {
  name: string;
  value: number;
  color: string;
  count: number;
}

interface DistributionTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
  t: ReturnType<typeof useI18n>;
  locale: string;
}

function DistributionTooltip({ active, payload, t, locale }: DistributionTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const data = payload[0].payload
  return (
    <WidgetTooltip
      title={data.name}
      rows={[
        {
          label: t('tradeDistribution.tooltip.percentage'),
          value: formatPercent(data.value, locale, { maximumFractionDigits: 2 }),
          color: data.color,
        },
        {
          label: t('tradeDistribution.tooltip.type'),
          value: formatCount(data.count, locale),
        },
      ]}
    />
  )
}

export default function TradeDistributionChart({ size = 'medium' }: TradeDistributionProps) {
  const { statistics: { nbWin, nbLoss, nbBe, nbTrades }, isLoading } = useData()
  const t = useI18n()
  const locale = useCurrentLocale()

  const chartData = React.useMemo<ChartDataPoint[]>(() => {
    if (!nbTrades) return []

    const winRate = Number((nbWin / nbTrades * 100).toFixed(2))
    const lossRate = Number((nbLoss / nbTrades * 100).toFixed(2))
    const beRate = Number((nbBe / nbTrades * 100).toFixed(2))

    return [
      { name: t('tradeDistribution.winWithCount', { count: nbWin, total: nbTrades }), value: winRate, color: chartColors.win, count: nbWin },
      { name: t('tradeDistribution.breakevenWithCount', { count: nbBe, total: nbTrades }), value: beRate, color: chartColors.neutral, count: nbBe },
      { name: t('tradeDistribution.lossWithCount', { count: nbLoss, total: nbTrades }), value: lossRate, color: chartColors.loss, count: nbLoss }
    ]
  }, [nbWin, nbLoss, nbBe, nbTrades, t])

  return (
    <WidgetCard>
      <WidgetHeader
        size={size}
        title={t('tradeDistribution.title')}
        description={t('tradeDistribution.description')}
      />
      <WidgetBody
        size={size}
        flush
        className={cn("flex flex-col", isCompactSize(size) ? "p-1" : "p-2")}
      >
        {isLoading ? (
          <DonutChartLoadingSkeleton size={size} />
        ) : chartData.length === 0 ? (
          <WidgetEmpty size={size} message={t("chat.noTradesAvailable")} />
        ) : (
          <>
            <div className="min-h-0 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={isCompactSize(size) ? "60%" : "65%"}
                    outerRadius={isCompactSize(size) ? "80%" : "85%"}
                    paddingAngle={2}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                    stroke="hsl(var(--background))"
                    strokeWidth={1}
                    isAnimationActive={false}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                      />
                    ))}
                    <Label
                      position="center"
                      content={(props: Props) => {
                        if (!props.viewBox) return null;
                        const viewBox = props.viewBox as PolarViewBox;
                        if (!viewBox.cx || !viewBox.cy) return null;
                        const cx = viewBox.cx;
                        const cy = viewBox.cy;

                        // Use a percentage of the distance from center to edge for label positioning
                        const labelRadius = Math.min(cx, cy) * (isCompactSize(size) ? 0.95 : 1.1); // Position labels at 95% or 100% of available space

                        return chartData.map((entry, index) => {
                          const angle = -90 + (360 * (entry.value / 100) / 2) + (360 * chartData.slice(0, index).reduce((acc, curr) => acc + curr.value, 0) / 100);
                          const x = cx + labelRadius * Math.cos((angle * Math.PI) / 180);
                          const y = cy + labelRadius * Math.sin((angle * Math.PI) / 180);
                          return (
                            <text
                              key={index}
                              x={x}
                              y={y}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fill={chartColors.tick}
                              fontSize={chartTickFontSize(size)}
                            >
                              {entry.value > 5
                                ? formatPercent(entry.value, locale, { maximumFractionDigits: 0 })
                                : ''}
                            </text>
                          );
                        });
                      }}
                    />
                  </Pie>
                  <Tooltip
                    content={<DistributionTooltip t={t} locale={locale} />}
                    wrapperStyle={{ zIndex: 1000 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <WidgetChartLegend
              className={cn(
                "shrink-0 justify-center",
                isCompactSize(size) ? "pt-1" : "pt-3",
              )}
              items={chartData.map((entry) => ({
                label: entry.name,
                color: entry.color,
              }))}
            />
          </>
        )}
      </WidgetBody>
    </WidgetCard>
  )
}
