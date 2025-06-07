'use client'

import * as React from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig } from "@/components/ui/chart"
import { useData } from "@/context/data-provider"
import { cn } from "@/lib/utils"
import { Info } from 'lucide-react'
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { WidgetSize } from '@/app/[locale]/dashboard/types/dashboard'
import { useI18n } from "@/locales/client"

interface CommissionsPnLChartProps {
  size?: WidgetSize
}

const chartConfig = {
  pnl: {
    label: "Net P/L",
    color: "hsl(var(--chart-3))",
  },
  commissions: {
    label: "Commissions",
    color: "hsl(var(--chart-4))",
  },
} satisfies ChartConfig

const formatCurrency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

const formatPercentage = (value: number) =>
  `${(value * 100).toFixed(1)}%`

export default function CommissionsPnLChart({ size = 'medium' }: CommissionsPnLChartProps) {
  const { formattedTrades:trades } = useData()
  const t = useI18n()

  const chartData = React.useMemo(() => {
    const totalPnL = trades.reduce((sum, trade) => sum + trade.pnl, 0)
    const totalCommissions = trades.reduce((sum, trade) => sum + trade.commission, 0)
    const total = Math.abs(totalPnL) + Math.abs(totalCommissions)

    return [
      {
        name: t('commissions.legend.netPnl'),
        value: totalPnL,
        percentage: totalPnL / total,
        fill: chartConfig.pnl.color
      },
      {
        name: t('commissions.legend.commissions'),
        value: totalCommissions,
        percentage: totalCommissions / total,
        fill: chartConfig.commissions.color
      }
    ]
  }, [trades, t])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <div className="grid gap-2">
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {t('commissions.tooltip.type')}
              </span>
              <span className="font-bold text-muted-foreground">
                {data.name}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {t('commissions.tooltip.amount')}
              </span>
              <span className="font-bold">
                {formatCurrency(data.value)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {t('commissions.tooltip.percentage')}
              </span>
              <span className="font-bold text-muted-foreground">
                {formatPercentage(data.percentage)}
              </span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex justify-center gap-4 pt-2">
        {payload.map((entry: any, index: number) => (
          <div key={`legend-${index}`} className="flex items-center gap-1.5">
            <div 
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-muted-foreground">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    )
  }

  const getChartHeight = () => {
    switch (size) {
      case 'small-long':
        return 140
      case 'medium':
        return 200
      case 'large':
        return 280
      default:
        return 200
    }
  }

  const getOuterRadius = () => {
    switch (size) {
      case 'small-long':
        return 45
      case 'medium':
        return 70
      case 'large':
        return 100
      default:
        return 70
    }
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader 
        className={cn(
          "flex flex-col items-stretch space-y-0 border-b shrink-0",
          size === 'small-long' ? "p-2" : "p-3 sm:p-4"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CardTitle 
              className={cn(
                "line-clamp-1",
                size === 'small-long' ? "text-sm" : "text-base"
              )}
            >
              {t('commissions.title')}
            </CardTitle>
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Info className={cn(
                    "text-muted-foreground hover:text-foreground transition-colors cursor-help",
                    size === 'small-long' ? "h-3.5 w-3.5" : "h-4 w-4"
                  )} />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{t('commissions.tooltip.description')}</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent 
        className={cn(
          "flex-1 min-h-0",
          size === 'small-long' ? "p-1" : "p-2 sm:p-4"
        )}
      >
        <div className={cn(
          "w-full h-full"
        )}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="45%"
                innerRadius={getOuterRadius() * 0.6}
                outerRadius={getOuterRadius()}
                paddingAngle={2}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`}
                    fill={entry.fill}
                    className="transition-all duration-300 ease-in-out"
                  />
                ))}
              </Pie>
              <Tooltip 
                content={<CustomTooltip />}
                wrapperStyle={{ 
                  fontSize: size === 'small-long' ? '10px' : '12px',
                  zIndex: 1000
                }} 
              />
              <Legend 
                content={<CustomLegend />}
                verticalAlign="bottom"
                align="center"
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}