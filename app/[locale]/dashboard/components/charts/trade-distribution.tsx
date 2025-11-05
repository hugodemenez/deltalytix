"use client"

import * as React from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Label } from "recharts"
import type { Props } from 'recharts/types/component/Label'
import type { PolarViewBox } from 'recharts/types/util/types'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useData } from "@/context/data-provider"
import { cn } from "@/lib/utils"
import { WidgetSize } from '@/app/[locale]/dashboard/types/dashboard'
import { Info } from 'lucide-react'
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useI18n } from "@/locales/client"

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
      <div className="rounded-lg border bg-background p-2 shadow-xs">
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
  const { statistics: { nbWin, nbLoss, nbBe, nbTrades } } = useData()
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

  const renderColorfulLegendText = (value: string, entry: any) => {
    return <span className="text-xs text-muted-foreground">{value}</span>;
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader 
        className={cn(
          "flex flex-row items-center justify-between space-y-0 border-b shrink-0",
          size === 'small' ? "p-2 h-10" : "p-3 sm:p-4 h-14"
        )}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5">
            <CardTitle 
              className={cn(
                "line-clamp-1",
                size === 'small' ? "text-sm" : "text-base"
              )}
            >
              {t('tradeDistribution.title')}
            </CardTitle>
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Info className={cn(
                    "text-muted-foreground hover:text-foreground transition-colors cursor-help",
                    size === 'small' ? "h-3.5 w-3.5" : "h-4 w-4"
                  )} />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{t('tradeDistribution.description')}</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent 
        className={cn(
          "flex-1 min-h-0",
          size === 'small' ? "p-1" : "p-2 sm:p-4"
        )}
      >
        <div className="w-full h-full">
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
                    className="transition-all duration-300 ease-in-out hover:opacity-80 dark:brightness-90"
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
                  fontSize: size === 'small' ? '10px' : '12px',
                  zIndex: 1000
                }} 
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
} 