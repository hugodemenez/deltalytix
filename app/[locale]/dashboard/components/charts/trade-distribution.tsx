"use client"

import * as React from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Label } from "recharts"
import type { Props } from 'recharts/types/component/Label'
import type { PolarViewBox } from 'recharts/types/util/types'
import { useData } from "@/context/data-provider"
import { WidgetSize } from '@/app/[locale]/dashboard/types/dashboard'
import { useI18n } from "@/locales/client"
import { DonutChartLoadingSkeleton } from "./chart-loading-skeleton"
import { shareConclusion } from "./chart-conclusions"
import {
  CHART_TOOLTIP_CLASS,
  CHART_TOOLTIP_WRAPPER,
  chartTooltipFontSize,
} from "./chart-glance"
import { ChartWidgetFrame } from "./chart-widget-frame"

interface TradeDistributionProps {
  size?: WidgetSize
}

interface ChartDataPoint {
  name: string;
  value: number;
  color: string;
  count: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ChartDataPoint;
  }>;
}

const CustomTooltip = ({ active, payload }: TooltipProps) => {
  const t = useI18n()
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className={CHART_TOOLTIP_CLASS}>
        <div className="grid gap-2">
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {t('tradeDistribution.tooltip.type')}
            </span>
            <span className="font-bold text-muted-foreground">
              {data.name}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {t('tradeDistribution.tooltip.percentage')}
            </span>
            <span className="font-bold">
              {data.value.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function TradeDistributionChart({ size = 'medium' }: TradeDistributionProps) {
  const { statistics: { nbWin, nbLoss, nbBe, nbTrades }, isLoading } = useData()
  const t = useI18n()

  const chartData = React.useMemo(() => {
    const winRate = Number((nbWin / nbTrades * 100).toFixed(2))
    const lossRate = Number((nbLoss / nbTrades * 100).toFixed(2))
    const beRate = Number((nbBe / nbTrades * 100).toFixed(2))

    return [
      { name: t('tradeDistribution.winWithCount', { count: nbWin, total: nbTrades }), value: winRate, color: 'hsl(var(--chart-win))', count: nbWin },
      { name: t('tradeDistribution.breakevenWithCount', { count: nbBe, total: nbTrades }), value: beRate, color: 'hsl(var(--muted-foreground))', count: nbBe },
      { name: t('tradeDistribution.lossWithCount', { count: nbLoss, total: nbTrades }), value: lossRate, color: 'hsl(var(--chart-loss))', count: nbLoss }
    ]
  }, [nbWin, nbLoss, nbBe, nbTrades, t])

  const conclusion = shareConclusion(nbWin, nbTrades)
  const subtitle =
    conclusion.kind === "empty"
      ? t("tradeDistribution.subtitle.empty")
      : t("tradeDistribution.subtitle.share", { percent: conclusion.percent })

  const renderColorfulLegendText = (value: string, entry: any) => {
    return <span className="text-xs text-muted-foreground">{value}</span>;
  }

  return (
    <ChartWidgetFrame
      size={size}
      title={t('tradeDistribution.title')}
      subtitle={subtitle}
      description={t('tradeDistribution.description')}
    >
      {isLoading ? (
        <DonutChartLoadingSkeleton size={size} />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="45%"
              innerRadius={size === 'small' ? "60%" : "65%"}
              outerRadius={size === 'small' ? "80%" : "85%"}
              paddingAngle={2}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
              stroke="hsl(var(--background))"
              strokeWidth={1}
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
                  const labelRadius = Math.min(cx, cy) * (size === 'small' ? 0.95 : 1.1); // Position labels at 95% or 100% of available space

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
                        className="fill-muted-foreground font-medium translate-y-2"
                        style={{ 
                          fontSize: size === 'small' ? '10px' : '12px'
                        }}
                      >
                        {entry.value > 5 ? `${Math.round(entry.value)}%` : ''}
                      </text>
                    );
                  });
                }}
              />
            </Pie>
            <Legend 
              verticalAlign="bottom"
              align="center"
              iconSize={8}
              iconType="circle"
              formatter={renderColorfulLegendText}
              wrapperStyle={{
                paddingTop: size === 'small' ? 0 : 16
              }}
            />
            <Tooltip 
              content={<CustomTooltip />}
              wrapperStyle={{
                fontSize: chartTooltipFontSize(size),
                ...CHART_TOOLTIP_WRAPPER,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </ChartWidgetFrame>
  )
}
