"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer } from "@/components/ui/chart"
import { useFormattedTrades } from "@/components/context/trades-data"
import { TickDetails, Trade } from "@prisma/client"
import { useCallback, useEffect, useState } from "react"
import { getTickDetails } from "../../server/tick-details"
import { cn } from "@/lib/utils"

interface ContractSpec {
  tickSize: number
  tickValue: number
}

const defaultContractSpecs: { [key: string]: ContractSpec } = {
  NQ: { tickSize: 0.25, tickValue: 5 },
  YM: { tickSize: 1, tickValue: 5 },
  MYM: { tickSize: 1, tickValue: 0.5 },
  MNQ: { tickSize: 0.25, tickValue: 0.5 },
  ES: { tickSize: 0.25, tickValue: 12.50 },
  MES: { tickSize: 0.25, tickValue: 1.25 },
  ZN: { tickSize: 1 / 64, tickValue: 15.625 },
  ZB: { tickSize: 1 / 32, tickValue: 31.25 },
  GC: { tickSize: 0.10, tickValue: 10.00 },
  SI: { tickSize: 0.005, tickValue: 25.00 },
  ZC: { tickSize: 0.01, tickValue: 12.50 },
  UB: { tickSize: 0.01, tickValue: 31.25 },
}

const chartConfig = {
  tradeCount: {
    label: "Number of Trades",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

interface TickDistributionChartProps {
  size?: 'small' | 'medium' | 'large' | 'small-long'
}

export default function TickDistributionChart({ size = 'medium' }: TickDistributionChartProps) {
  const { formattedTrades: trades } = useFormattedTrades()
  const [tickDetails, setTickDetails] = useState<TickDetails[]>([])
  const [chartData, setChartData] = useState<{ ticks: number; tradeCount: number }[]>([])

  // Fetch tick details
  useEffect(() => {
    const fetchTickDetails = async () => {
      const details = await getTickDetails()
      console.log(details)
      setTickDetails(details)
    }
    fetchTickDetails()
  }, [])

  // Calculate chart data
  useEffect(() => {
    const calculateChartData = () => {
      if (!tickDetails.length || !trades.length) return

      const tickDistribution: { [key: number]: number } = {}

      trades.forEach((trade: Trade) => {
        const contractSpec = tickDetails.find(detail => detail.ticker === trade.instrument) || { tickSize: 1, tickValue: 1 }
        const tickValue = Math.round(trade.pnl / trade.quantity / contractSpec.tickValue)

        if (!tickDistribution[tickValue]) {
          tickDistribution[tickValue] = 0
        }
        tickDistribution[tickValue]++
      })

      const newChartData = Object.entries(tickDistribution)
        .map(([ticks, count]) => ({
          ticks: parseInt(ticks),
          tradeCount: count,
        }))
        .sort((a, b) => a.ticks - b.ticks)

      setChartData(newChartData)
    }

    calculateChartData()
  }, [trades, tickDetails])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background p-2 border rounded shadow-sm">
          <p className="font-semibold">{`${label} ticks`}</p>
          <p>Number of Trades: {data.tradeCount}</p>
        </div>
      )
    }
    return null
  }

  // Update the formatter to always return a string
  const formatYAxisTick = (value: any): string => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`
    }
    return value.toString()
  }

  // Update the chart height calculations
  const getChartHeight = () => {
    switch (size) {
      case 'small':
      case 'small-long':
        return 'h-[140px]'
      case 'medium':
        return 'h-[280px]'
      case 'large':
        return 'h-[320px]'
      default:
        return 'h-[280px]'
    }
  }

  return (
    <Card className="h-full">
      <CardHeader 
        className={cn(
          "flex flex-col items-stretch space-y-0 border-b",
          (size === 'small' || size === 'small-long')
            ? "p-2 min-h-[40px]" 
            : "p-4 sm:p-6 sm:min-h-[90px]"
        )}
      >
        <div className="flex items-center justify-between">
          <CardTitle 
            className={cn(
              "line-clamp-1",
              (size === 'small' || size === 'small-long') ? "text-sm" : "text-base sm:text-lg"
            )}
          >
            Tick Distribution
          </CardTitle>
        </div>
        <CardDescription 
          className={cn(
            (size === 'small' || size === 'small-long') ? "hidden" : "text-xs sm:text-sm"
          )}
        >
          Distribution of trades based on their tick value
        </CardDescription>
      </CardHeader>
      <CardContent 
        className={cn(
          (size === 'small' || size === 'small-long') ? "p-1" : "p-2 sm:p-6"
        )}
      >
        <ChartContainer
          config={chartConfig}
          className={cn(
            "w-full",
            getChartHeight(),
            (size === 'small' || size === 'small-long')
              ? "aspect-[3/2]" 
              : "aspect-[4/3] sm:aspect-[16/9]"
          )}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={
                (size === 'small' || size === 'small-long')
                  ? { left: 10, right: 4, top: 4, bottom: 0 }
                  : { left: 16, right: 8, top: 8, bottom: 0 }
              }
            >
              <CartesianGrid 
                vertical={false} 
                strokeDasharray="3 3" 
                opacity={(size === 'small' || size === 'small-long') ? 0.5 : 1}
              />
              <XAxis
                dataKey="ticks"
                tickLine={false}
                axisLine={false}
                tickMargin={(size === 'small' || size === 'small-long') ? 4 : 8}
                tick={{ fontSize: (size === 'small' || size === 'small-long') ? 10 : 12 }}
                interval={(size === 'small' || size === 'small-long') ? 1 : "preserveStartEnd"}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={(size === 'small' || size === 'small-long') ? 4 : 8}
                tick={{ fontSize: (size === 'small' || size === 'small-long') ? 10 : 12 }}
                width={(size === 'small' || size === 'small-long') ? 35 : 45}
                tickFormatter={formatYAxisTick}
              />
              <Tooltip 
                content={<CustomTooltip />}
                wrapperStyle={{ 
                  fontSize: (size === 'small' || size === 'small-long') ? '10px' : '12px'
                }} 
              />
              <Bar
                dataKey="tradeCount"
                fill="hsl(var(--chart-1))"
                radius={[4, 4, 0, 0]}
                maxBarSize={(size === 'small' || size === 'small-long') ? 30 : 50}
                className="transition-all duration-300 ease-in-out"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
