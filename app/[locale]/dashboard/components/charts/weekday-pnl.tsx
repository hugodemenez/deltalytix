"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from "recharts"
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
import { Button } from "@/components/ui/button"

const daysOfWeek = [0, 1, 2, 3, 4, 5, 6]; // Sunday = 0, Saturday = 6

type WeekdayTranslationKey =
  | 'weekdayPnl.days.sunday'
  | 'weekdayPnl.days.monday'
  | 'weekdayPnl.days.tuesday'
  | 'weekdayPnl.days.wednesday'
  | 'weekdayPnl.days.thursday'
  | 'weekdayPnl.days.friday'
  | 'weekdayPnl.days.saturday';

interface WeekdayPNLChartProps {
  size?: WidgetSize
}

const formatCurrency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

const getDayTranslationKey = (day: number): WeekdayTranslationKey => {
  const keys: WeekdayTranslationKey[] = [
    'weekdayPnl.days.sunday',
    'weekdayPnl.days.monday',
    'weekdayPnl.days.tuesday',
    'weekdayPnl.days.wednesday',
    'weekdayPnl.days.thursday',
    'weekdayPnl.days.friday',
    'weekdayPnl.days.saturday'
  ];
  return keys[day];
}

const chartConfig = {
  pnl: {
    label: "PnL",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

export default function WeekdayPNLChart({ size = 'medium' }: WeekdayPNLChartProps) {
  const {calendarData, weekdayFilter, setWeekdayFilter} = useData()
  const [darkMode, setDarkMode] = React.useState(false)
  const [activeDay, setActiveDay] = React.useState<number | null>(null)
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
    }), {} as Record<number, { total: number, count: number }>)

    Object.entries(calendarData).forEach(([date, entry]) => {
      const dayOfWeek = new Date(date).getUTCDay()
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

  const handleClick = React.useCallback(() => {
    if (activeDay === null) return
    if (weekdayFilter.day === activeDay) {
      setWeekdayFilter({ day: null })
    } else {
      setWeekdayFilter({ day: activeDay })
    }
  }, [activeDay, weekdayFilter.day, setWeekdayFilter])

  const CustomTooltip = ({ active, payload, label }: any) => {
    React.useEffect(() => {
      if (active && payload && payload.length) {
        setActiveDay(payload[0].payload.day)
      } else {
        setActiveDay(null)
      }
    }, [active, payload])

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
                {t(getDayTranslationKey(data.day))}
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

  return (
    <Card className="h-full flex flex-col">
      <CardHeader 
        className={cn(
          "flex flex-row items-center justify-between space-y-0 border-b shrink-0",
          size === 'small-long' ? "p-2 h-[40px]" : "p-3 sm:p-4 h-[56px]"
        )}
      >
        <div className="flex items-center justify-between w-full">
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
          {weekdayFilter.day !== null && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 lg:px-3"
              onClick={() => setWeekdayFilter({ day: null })}
            >
              {t('weekdayPnl.clearFilter')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent 
        className={cn(
          "flex-1 min-h-0",
          size === 'small-long' ? "p-1" : "p-2 sm:p-4"
        )}
      >
        <div 
          className="w-full h-full cursor-pointer" 
          onClick={handleClick}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={weekdayData}
              margin={
                size === 'small-long'
                  ? { left: 0, right: 4, top: 4, bottom: 20 }
                  : { left: 0, right: 8, top: 8, bottom: 24 }
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
                tickFormatter={(value) => {
                  const key = getDayTranslationKey(value);
                  return size === 'small-long' ? t(key).slice(0, 3) : t(key)
                }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={45}
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
                fill={chartConfig.pnl.color}
                radius={[3, 3, 0, 0]}
                maxBarSize={size === 'small-long' ? 25 : 40}
                className="transition-all duration-300 ease-in-out"
                opacity={weekdayFilter.day !== null ? 0.3 : 1}
              >
                {weekdayData.map((entry) => (
                  <Cell 
                    key={`cell-${entry.day}`} 
                    fill={getColor(entry.pnl)}
                    opacity={weekdayFilter.day === entry.day ? 1 : (weekdayFilter.day !== null ? 0.3 : 1)}
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