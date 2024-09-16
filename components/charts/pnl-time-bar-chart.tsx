"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Cell } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer } from "@/components/ui/chart"
import { useFormattedTrades, useTrades } from "@/components/context/trades-data"
import { Trade } from "@prisma/client"

const chartConfig = {
  avgPnl: {
    label: "Average P/L",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

const formatCurrency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

export default function TimeOfDayTradeChart() {
  const { formattedTrades :trades} = useFormattedTrades()

  const chartData = React.useMemo(() => {
    const hourlyData: { [hour: string]: { totalPnl: number; count: number } } = {}
    
    // Initialize hourly data for all 24 hours
    for (let i = 0; i < 24; i++) {
      hourlyData[i.toString()] = { totalPnl: 0, count: 0 }
    }

    // Sum up PNL and count trades for each hour
    trades.forEach((trade: Trade) => {
      const hour = new Date(trade.entryDate).getHours().toString()
      hourlyData[hour].totalPnl += trade.pnl
      hourlyData[hour].count++
    })

    // Convert to array format for Recharts and calculate average PNL
    return Object.entries(hourlyData)
      .map(([hour, data]) => ({
        hour: parseInt(hour),
        avgPnl: data.count > 0 ? data.totalPnl / data.count : 0,
        tradeCount: data.count,
      }))
      .sort((a, b) => a.hour - b.hour)
  }, [trades])

  const maxTradeCount = Math.max(...chartData.map(data => data.tradeCount))

  const getColor = (count: number) => {
    const intensity = Math.max(0.2, count / maxTradeCount)
    return `hsl(var(--chart-1) / ${intensity})`
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background p-2 border rounded shadow-sm">
          <p className="font-semibold">{`${label}h - ${(label + 1) % 24}h`}</p>
          <p className="font-bold">Avg P/L: {formatCurrency(data.avgPnl)}</p>
          <p>Number of Trades: {data.tradeCount}</p>
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader className="sm:min-h-[120px] flex flex-col items-stretch space-y-0 border-b p-6">
        <CardTitle>Average P/L by Time of Day</CardTitle>
        <CardDescription>Showing average profit/loss for each hour of the day. Darker bars indicate more trades.</CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[350px] w-full"
        >
          <BarChart
            data={chartData}
            margin={{
              left: 12,
              right: 12,
              top: 12,
              bottom: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="hour"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `${value}h`}
              ticks={[0, 3, 6, 9, 12, 15, 18, 21]}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="avgPnl"
              radius={[4, 4, 0, 0]}
              className="transition-all duration-300 ease-in-out"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getColor(entry.tradeCount)}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}