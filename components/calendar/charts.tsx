"use client"

import React from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell, Tooltip } from "recharts"
import { CalendarEntry } from "@/components/calendar/calendar-pnl"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
} from "@/components/ui/chart"

interface ChartsProps {
  dayData: CalendarEntry | undefined;
}

const chartConfig = {
  pnl: {
    label: "Trade P/L",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

const formatCurrency = (value: number) =>
  `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const formatTime = (dateString: string) => new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  } else {
    return `${remainingSeconds}s`
  }
}

const positiveColor = "hsl(var(--chart-2))" // Green color
const negativeColor = "hsl(var(--chart-1))" // Orangish color

export function Charts({ dayData }: ChartsProps) {
  if (!dayData || !dayData.trades || dayData.trades.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">No trade data available for this day</p>
      </div>
    )
  }

  const chartData = dayData.trades.map((trade, index) => ({
    tradeNumber: index + 1,
    pnl: trade.pnl,
    symbol: trade.instrument,
    side: trade.side,
    time: trade.entryDate,
    duration: trade.timeInPosition,
  }))

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background p-2 border rounded shadow-sm">
          <p className="font-semibold">Trade #{label}</p>
          <p className={`font-bold ${data.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            P/L: {formatCurrency(data.pnl)}
          </p>
          <p>Symbol: {data.symbol}</p>
          <p>Side: {data.side}</p>
          <p>Time: {formatTime(data.time)}</p>
          <p>Duration: {formatDuration(data.duration)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="h-full">
      <CardHeader className="sm:min-h-[120px] flex flex-col items-stretch space-y-0 border-b p-6">
        <CardTitle>
          Daily Trades P/L
        </CardTitle>
        <CardDescription>
          Showing P/L for each trade of the day
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:p-6 h-[calc(100%-120px)]">
        <ChartContainer
          config={chartConfig}
          className="h-full w-full"
        >
          <BarChart
            accessibilityLayer
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
              dataKey="tradeNumber"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={formatCurrency}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="pnl"
              radius={[4, 4, 0, 0]}
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
        </ChartContainer>
      </CardContent>
    </Card>
  )
}