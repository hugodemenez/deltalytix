"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig } from "@/components/ui/chart"
import { useCalendarData } from "../../../../../components/context/trades-data"
import { cn } from "@/lib/utils"
import { Info } from 'lucide-react'
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ChartSize } from '@/app/[locale]/(dashboard)/types/dashboard'
import { useI18n } from "@/locales/client"

const chartConfig = {
  pnl: {
    label: "Average P/L",
    color: "hsl(var(--chart-5))",
  },
} satisfies ChartConfig

const daysOfWeek = ['weekdayPnl.days.sunday', 'weekdayPnl.days.monday', 'weekdayPnl.days.tuesday', 'weekdayPnl.days.wednesday', 'weekdayPnl.days.thursday', 'weekdayPnl.days.friday', 'weekdayPnl.days.saturday'];

interface WeekdayPNLChartProps {
  size?: ChartSize
}

const formatCurrency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

const CustomTooltip = ({ active, payload, label }: any) => {
  const t = useI18n()
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid gap-2">
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {t('weekdayPnl.tooltip.day')}
            </span>
            <span className="font-bold text-muted-foreground">
              {t(label, {})}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {t('weekdayPnl.tooltip.averagePnl')}
            </span>
            <span className="font-bold">
              {formatCurrency(data.pnl)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {t('weekdayPnl.tooltip.trades')}
            </span>
            <span className="font-bold text-muted-foreground">
              {data.tradeCount} {data.tradeCount !== 1 ? t('weekdayPnl.tooltip.trades_plural') : t('weekdayPnl.tooltip.trade')}
            </span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

export default function WeekdayPNLChart({ size = 'medium' }: WeekdayPNLChartProps) {
  const {calendarData} = useCalendarData()
  const [darkMode, setDarkMode] = React.useState(false)
  const t = useI18n()

  React.useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark')
    setDarkMode(isDarkMode)

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          setDarkMode(document.documentElement.classList.contains('dark'))
        }
      })
    })

    observer.observe(document.documentElement, { attributes: true })
    return () => observer.disconnect()
  }, [])

  const weekdayData = React.useMemo(() => {
    const weekdayTotals = daysOfWeek.reduce((acc, day) => ({ 
      ...acc, 
      [day]: { total: 0, count: 0 } 
    }), {} as Record<string, { total: number, count: number }>)

    Object.entries(calendarData).forEach(([date, entry]) => {
      const dayOfWeek = daysOfWeek[new Date(date).getDay()]
      weekdayTotals[dayOfWeek].total += entry.pnl
      weekdayTotals[dayOfWeek].count += 1
    })

    return daysOfWeek.map(day => ({
      day,
      pnl: weekdayTotals[day].count > 0 ? weekdayTotals[day].total / weekdayTotals[day].count : 0,
      tradeCount: weekdayTotals[day].count
    }))
  }, [calendarData])

  const maxPnL = Math.max(...weekdayData.map(d => d.pnl))
  const minPnL = Math.min(...weekdayData.map(d => d.pnl))

  const getColor = (value: number) => {
    const ratio = Math.abs((value - minPnL) / (maxPnL - minPnL))
    const baseColorVar = value >= 0 ? '--chart-3' : '--chart-4'
    const intensity = darkMode ? 
      Math.max(0.3, ratio) : // Higher minimum intensity in dark mode
      Math.max(0.2, ratio)   // Lower minimum intensity in light mode
    return `hsl(var(${baseColorVar}) / ${intensity})`
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
              {t('weekdayPnl.title')}
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
                  <p>{t('weekdayPnl.description')}</p>
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
              data={weekdayData}
              margin={
                size === 'small-long'
                  ? { left: 10, right: 4, top: 4, bottom: 20 }
                  : { left: 10, right: 8, top: 8, bottom: 24 }
              }
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                className="text-border dark:opacity-[0.12] opacity-[0.2]"
              />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                height={size === 'small-long' ? 20 : 24}
                tickMargin={size === 'small-long' ? 4 : 8}
                tick={{ 
                  fontSize: size === 'small-long' ? 9 : 11,
                  fill: 'currentColor'
                }}
                tickFormatter={(value) => size === 'small-long' ? t(value, {}).slice(0, 3) : t(value, {})}
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
                {weekdayData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getColor(entry.pnl)}
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