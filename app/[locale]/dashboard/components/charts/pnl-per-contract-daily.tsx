'use client'

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer, ReferenceLine } from "recharts"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { WidgetSize } from '@/app/[locale]/dashboard/types/dashboard'
import { useI18n } from "@/locales/client"
import { usePnLPerContractDailyStore } from "@/store/pnl-per-contract-daily-store"
import { formatInTimeZone } from 'date-fns-tz'
import { useUserStore } from '@/store/user-store'

interface PnLPerContractDailyChartProps {
  size?: WidgetSize
}

const chartConfig = {
  pnl: {
    label: "Avg Net P/L per Contract",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

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
              {t('pnlPerContractDaily.tooltip.date')}
            </span>
            <span className="font-bold text-muted-foreground">
              {data.date}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {t('pnlPerContractDaily.tooltip.averagePnl')}
            </span>
            <span className="font-bold">
              {formatCurrency(data.averagePnl)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {t('pnlPerContractDaily.tooltip.totalPnl')}
            </span>
            <span className="font-bold text-muted-foreground">
              {formatCurrency(data.totalPnl)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {t('pnlPerContractDaily.tooltip.trades')}
            </span>
            <span className="font-bold text-muted-foreground">
              {data.tradeCount} {t('pnlPerContractDaily.tooltip.trades')} ({(data.winCount / data.tradeCount * 100).toFixed(1)}% {t('pnlPerContractDaily.tooltip.winRate')})
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {t('pnlPerContractDaily.tooltip.totalContracts')}
            </span>
            <span className="font-bold text-muted-foreground">
              {data.totalContracts} {t('pnlPerContractDaily.tooltip.contracts')}
            </span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

export default function PnLPerContractDailyChart({ size = 'medium' }: PnLPerContractDailyChartProps) {
  const { formattedTrades: trades } = useData()
  const { timezone } = useUserStore()
  const { config, setSelectedInstrument } = usePnLPerContractDailyStore()
  const t = useI18n()

  // Get unique instruments from trades
  const availableInstruments = React.useMemo(() => {
    const instruments = Array.from(new Set(trades.map(trade => trade.instrument).filter(Boolean)))
    return instruments.sort()
  }, [trades])

  // Set default instrument if none selected and instruments are available
  React.useEffect(() => {
    if (!config.selectedInstrument && availableInstruments.length > 0) {
      setSelectedInstrument(availableInstruments[0])
    }
  }, [config.selectedInstrument, availableInstruments, setSelectedInstrument])

  const chartData = React.useMemo(() => {
    if (!config.selectedInstrument) return []

    // Filter trades for selected instrument
    const instrumentTrades = trades.filter(trade => trade.instrument === config.selectedInstrument)

    // Group trades by date
    const dateGroups = instrumentTrades.reduce((acc, trade) => {
      const entryDate = new Date(trade.entryDate)
      const dateKey = formatInTimeZone(entryDate, timezone, 'yyyy-MM-dd')
      
      if (!acc[dateKey]) {
        acc[dateKey] = {
          trades: [],
          totalPnl: 0,
          totalContracts: 0,
          winCount: 0
        }
      }
      
      const netPnl = trade.pnl - (trade.commission || 0)
      acc[dateKey].trades.push(trade)
      acc[dateKey].totalPnl += netPnl
      acc[dateKey].totalContracts += trade.quantity
      if (netPnl > 0) {
        acc[dateKey].winCount++
      }
      
      return acc
    }, {} as Record<string, { trades: any[], totalPnl: number, totalContracts: number, winCount: number }>)

    // Convert to chart data format and sort by date
    return Object.entries(dateGroups)
      .map(([date, data]) => ({
        date,
        averagePnl: data.totalContracts > 0 ? data.totalPnl / data.totalContracts : 0,
        totalPnl: data.totalPnl,
        tradeCount: data.trades.length,
        winCount: data.winCount,
        totalContracts: data.totalContracts
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [trades, config.selectedInstrument, timezone])

  const maxPnL = Math.max(...chartData.map(d => d.averagePnl))
  const minPnL = Math.min(...chartData.map(d => d.averagePnl))
  const absMax = Math.max(Math.abs(maxPnL), Math.abs(minPnL))

  const getColor = (value: number) => {
    const ratio = Math.abs(value / absMax)
    const baseColorVar = value >= 0 ? '--chart-3' : '--chart-4'
    const intensity = Math.max(0.2, ratio)
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
              {t('pnlPerContractDaily.title')}
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
                  <p>{t('pnlPerContractDaily.description')}</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={config.selectedInstrument}
              onValueChange={setSelectedInstrument}
            >
              <SelectTrigger className={cn(
                "w-[120px]",
                size === 'small-long' ? "h-7 text-xs" : "h-8 text-sm"
              )}>
                <SelectValue placeholder={t('pnlPerContractDaily.selectInstrument')} />
              </SelectTrigger>
              <SelectContent>
                {availableInstruments.map((instrument) => (
                  <SelectItem key={instrument} value={instrument}>
                    {instrument}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
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
                    const date = new Date(value)
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      timeZone: timezone
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
                  domain={[Math.min(minPnL * 1.1, 0), Math.max(maxPnL * 1.1, 0)]}
                />
                <ReferenceLine y={0} stroke="hsl(var(--border))" />
                <Tooltip 
                  content={<CustomTooltip />}
                  wrapperStyle={{ 
                    fontSize: size === 'small-long' ? '10px' : '12px',
                    zIndex: 1000
                  }} 
                />
                <Bar
                  dataKey="averagePnl"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={size === 'small-long' ? 25 : 40}
                  className="transition-all duration-300 ease-in-out"
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getColor(entry.averagePnl)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              {config.selectedInstrument 
                ? t('pnlPerContractDaily.noData')
                : t('pnlPerContractDaily.selectInstrument')
              }
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
