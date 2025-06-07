"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer } from "@/components/ui/chart"
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

interface PNLChartProps {
  size?: WidgetSize
}

interface ChartDataPoint {
  date: string;
  pnl: number;
  shortNumber: number;
  longNumber: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ChartDataPoint;
  }>;
  label?: string;
}

const chartConfig = {
  pnl: {
    label: "Daily P/L",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

const formatCurrency = (value: number) => {
  const absValue = Math.abs(value)
  if (absValue >= 1000000) {
    return `${value < 0 ? '-' : ''}$${(absValue / 1000000).toFixed(1)}M`
  }
  if (absValue >= 1000) {
    return `${value < 0 ? '-' : ''}$${(absValue / 1000).toFixed(1)}k`
  }
  return `${value < 0 ? '-' : ''}$${absValue.toFixed(0)}`
}

const positiveColor = "hsl(var(--chart-2))" // Green color
const negativeColor = "hsl(var(--chart-1))" // Orangish color

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  const t = useI18n()
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const date = new Date(data.date + 'T00:00:00Z');
    return (
      <div className="bg-background p-2 border rounded shadow-sm">
        <p className="font-semibold">
          {date.toLocaleDateString("en-US", { 
            month: "short", 
            day: "numeric", 
            year: "numeric",
            timeZone: 'UTC'
          })}
        </p>
        <p className={`font-bold ${data.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {t('pnl.tooltip.pnl')}: {formatCurrency(data.pnl)}
        </p>
        <p>{t('pnl.tooltip.longTrades')}: {data.longNumber}</p>
        <p>{t('pnl.tooltip.shortTrades')}: {data.shortNumber}</p>
      </div>
    );
  }
  return null;
};

export default function PNLChart({ size = 'medium' }: PNLChartProps) {
  const { calendarData } = useData()
  const t = useI18n()

  const chartData = React.useMemo(() => 
    Object.entries(calendarData)
      .map(([date, values]) => ({
        date,
        pnl: values.pnl,
        shortNumber: values.shortNumber,
        longNumber: values.longNumber,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [calendarData]
  );

  const maxPnL = Math.max(...chartData.map(d => d.pnl));
  const minPnL = Math.min(...chartData.map(d => d.pnl));

  const getChartHeight = () => {
    switch (size) {
      case 'small-long':
        return 'h-[140px]'
      case 'medium':
        return 'h-[200px]'
      case 'large':
        return 'h-[240px]'
      default:
        return 'h-[200px]'
    }
  }

  const getChartMargins = () => {
    switch (size) {
      case 'small-long':
        return { left: 10, right: 4, top: 4, bottom: 20 }
      case 'medium':
        return { left: 10, right: 8, top: 8, bottom: 24 }
      case 'large':
        return { left: 10, right: 12, top: 12, bottom: 28 }
      default:
        return { left: 10, right: 8, top: 8, bottom: 24 }
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
              {t('pnl.title')}
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
                  <p>{t('pnl.description')}</p>
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
            <BarChart
              data={chartData}
              margin={getChartMargins()}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                className="text-border dark:opacity-[0.12] opacity-[0.2]"
              />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                height={size === 'small-long' ? 20 : 24}
                tickMargin={size === 'small-long' ? 4 : 8}
                tick={{ 
                  fontSize: size === 'small-long' ? 9 : 11,
                  fill: 'currentColor'
                }}
                minTickGap={size === 'small-long' ? 30 : 50}
                tickFormatter={(value) => {
                  const date = new Date(value + 'T00:00:00Z')
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    timeZone: 'UTC'
                  })
                }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={60}
                tickMargin={4}
                tick={{ 
                  fontSize: size === 'small-long' ? 9 : 11,
                  fill: 'currentColor'
                }}
                tickFormatter={formatCurrency}
              />
              <Tooltip 
                content={<CustomTooltip />}
                wrapperStyle={{ 
                  fontSize: size === 'small-long' ? '10px' : '12px',
                  zIndex: 1000
                }} 
              />
              <Bar
                dataKey="pnl"
                radius={[3, 3, 0, 0]}
                maxBarSize={size === 'small-long' ? 25 : 40}
                className="transition-all duration-300 ease-in-out"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.pnl >= 0 ? positiveColor : negativeColor}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}