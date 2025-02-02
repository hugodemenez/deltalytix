"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig } from "@/components/ui/chart"
import { useUserData } from "@/components/context/user-data"
import { cn } from "@/lib/utils"
import { WidgetSize } from '@/app/[locale]/(dashboard)/types/dashboard'
import { Info } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useI18n } from "@/locales/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { TradeTableReview } from "../tables/trade-table-review"
import { Trade } from "@prisma/client"

interface TickDistributionProps {
  size?: WidgetSize
}

interface ChartDataPoint {
  ticks: string;
  count: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ChartDataPoint;
  }>;
  label?: string;
}

const chartConfig = {
  count: {
    label: "Count",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

const CustomTooltip = ({ active, payload }: TooltipProps) => {
  const t = useI18n()
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid gap-2">
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {t('tickDistribution.tooltip.ticks')}
            </span>
            <span className="font-bold text-muted-foreground">
              {data.ticks} {parseInt(data.ticks) !== 1 ? t('tickDistribution.tooltip.ticks_plural') : t('tickDistribution.tooltip.tick')}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {t('tickDistribution.tooltip.trades')}
            </span>
            <span className="font-bold">
              {data.count} {data.count !== 1 ? t('tickDistribution.tooltip.trades_plural') : t('tickDistribution.tooltip.trade')}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const formatCount = (value: number) => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`
  }
  return value.toString()
}

interface TickModalProps {
  isOpen: boolean
  onClose: () => void
  tickValue: string
  trades: Trade[]
}

function TickModal({ isOpen, onClose, tickValue, trades }: TickModalProps) {
  const t = useI18n()
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] w-[1200px] h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {`${trades.length} ${t('trade-table.trades')} @ ${tickValue} ${t('tickDistribution.tooltip.ticks')}`}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 -mx-6">
          <TradeTableReview trades={trades} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function TickDistributionChart({ size = 'medium' }: TickDistributionProps) {
  const { formattedTrades: trades, tickDetails } = useUserData()
  const [selectedTick, setSelectedTick] = React.useState<string | null>(null)
  const [modalTrades, setModalTrades] = React.useState<Trade[]>([])
  const t = useI18n()

  const chartData = React.useMemo(() => {
    if (!trades.length) return []

    // Create a map to store tick counts
    const tickCounts: Record<number, number> = {}

    // Count trades for each tick value
    trades.forEach(trade => {
      const matchingTicker = Object.keys(tickDetails).find(ticker => 
        trade.instrument.includes(ticker)
      )
      const tickValue = matchingTicker ? tickDetails[matchingTicker] : 1
      // Calculate PnL per contract first
      const pnlPerContract = Number(trade.pnl) / Number(trade.quantity)
      const ticks = Math.round(pnlPerContract / tickValue)
      tickCounts[ticks] = (tickCounts[ticks] || 0) + 1
    })

    // Convert the tick counts to sorted chart data
    return Object.entries(tickCounts)
      .map(([tick, count]) => ({
        ticks: tick === '0' ? '0' : Number(tick) > 0 ? `+${tick}` : `${tick}`,
        count
      }))
      .sort((a, b) => Number(a.ticks.replace('+', '')) - Number(b.ticks.replace('+', '')))

  }, [trades, tickDetails])

  const handleBarClick = (data: any) => {
    if (!data || !trades.length) return

    const clickedTicks = Number(data.ticks.replace('+', ''))
    const filteredTrades = trades.filter(trade => {
      const matchingTicker = Object.keys(tickDetails).find(ticker => 
        trade.instrument.includes(ticker)
      )
      const tickValue = matchingTicker ? tickDetails[matchingTicker] : 1
      // Calculate PnL per contract first
      const pnlPerContract = Number(trade.pnl) / Number(trade.quantity)
      const tradeTicks = Math.round(pnlPerContract / tickValue)
      return tradeTicks === clickedTicks
    })

    setSelectedTick(data.ticks)
    setModalTrades(filteredTrades)
  }

  return (
    <>
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
                {t('tickDistribution.title')}
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
                    <p>{t('tickDistribution.description')}</p>
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
          <div className={cn("w-full h-full")}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={
                  size === 'small-long'
                    ? { left: 0, right: 4, top: 4, bottom: 20 }
                    : { left: 0, right: 8, top: 8, bottom: 24 }
                }
                onClick={(e) => e?.activePayload && handleBarClick(e.activePayload[0].payload)}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  className="text-border dark:opacity-[0.12] opacity-[0.2]"
                />
                <XAxis
                  dataKey="ticks"
                  tickLine={false}
                  axisLine={false}
                  height={size === 'small-long' ? 20 : 24}
                  tickMargin={size === 'small-long' ? 4 : 8}
                  tick={(props) => {
                    const { x, y, payload } = props;
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text
                          x={0}
                          y={0}
                          dy={size === 'small-long' ? 8 : 4}
                          textAnchor={size === 'small-long' ? 'end' : 'middle'}
                          fill="currentColor"
                          fontSize={size === 'small-long' ? 9 : 11}
                          transform={size === 'small-long' ? 'rotate(-45)' : 'rotate(0)'}
                        >
                          {payload.value}
                        </text>
                      </g>
                    );
                  }}
                  interval="preserveStartEnd"
                  allowDataOverflow={true}
                  minTickGap={size === 'small-long' ? 15 : 30}
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
                  tickFormatter={formatCount}
                />
                <Tooltip 
                  content={<CustomTooltip />}
                  wrapperStyle={{ 
                    fontSize: size === 'small-long' ? '10px' : '12px',
                    zIndex: 1000
                  }} 
                />
                <Bar
                  dataKey="count"
                  fill="hsl(var(--chart-1))"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={size === 'small-long' ? 25 : 40}
                  className="transition-all duration-300 ease-in-out cursor-pointer hover:opacity-80"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <TickModal 
        isOpen={!!selectedTick}
        onClose={() => setSelectedTick(null)}
        tickValue={selectedTick || ''}
        trades={modalTrades}
      />
    </>
  )
}
