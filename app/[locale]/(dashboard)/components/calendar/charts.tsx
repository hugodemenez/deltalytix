"use client"

import React from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell, Tooltip, ResponsiveContainer } from "recharts"
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
import { Separator } from "@/components/ui/separator"
import { CalendarEntry } from "@/types/calendar"

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
  const remainingSeconds = Math.floor(seconds % 60)

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

  // Group trades by accountNumber
  const accountGroups = dayData.trades.reduce((groups, trade) => {
    const accountNumber = trade.accountNumber || 'Unknown'
    if (!groups[accountNumber]) {
      groups[accountNumber] = []
    }
    groups[accountNumber].push(trade)
    return groups
  }, {} as Record<string, typeof dayData.trades>)

  const calculateSummary = (trades: typeof dayData.trades) => ({
    pnl: trades.reduce((sum, trade) => sum + trade.pnl, 0),
    avgTimeInPosition: trades?.length > 0
      ? trades.reduce((sum, trade) => sum + trade.timeInPosition, 0) / trades?.length
      : 0,
    count: trades?.length || 0,
    longTrades: trades.filter(trade => trade.side?.toUpperCase() === 'LONG'),
    shortTrades: trades.filter(trade => trade.side?.toUpperCase() === 'SHORT'),
  })

  const accountSummaries = Object.entries(accountGroups).map(([accountNumber, trades]) => {
    const summary = calculateSummary(trades)
    return {
      accountNumber,
      ...summary,
      longSummary: calculateSummary(summary.longTrades),
      shortSummary: calculateSummary(summary.shortTrades),
      chartData: trades.map((trade, index) => ({
        tradeNumber: index + 1,
        pnl: trade.pnl,
        symbol: trade.instrument,
        side: trade.side,
        time: trade.entryDate,
        duration: trade.timeInPosition,
      }))
    }
  })

  const allTradesChartData = dayData.trades.map((trade, index) => ({
    tradeNumber: index + 1,
    pnl: trade.pnl,
    symbol: trade.instrument,
    side: trade.side,
    time: trade.entryDate,
    duration: trade.timeInPosition,
    accountNumber: trade.accountNumber,
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
          {data.accountNumber && <p>Account: {data.accountNumber}</p>}
        </div>
      );
    }
    return null;
  };

  const renderAccountCard = (accountSummary: any) => (
    <Card key={accountSummary.accountNumber} className="w-full">
      <CardHeader>
        <CardTitle>Account: {accountSummary.accountNumber}</CardTitle>
        <CardDescription>Trade summary and P/L chart for this account</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Overall</h3>
              <p>P/L: {formatCurrency(accountSummary.pnl)}</p>
              <p>Avg Time: {formatDuration(accountSummary.avgTimeInPosition)}</p>
              <p>Count: {accountSummary.count}</p>
            </div>
            <Separator />
            <div>
              <h3 className="text-lg font-semibold mb-2">Long Trades</h3>
              <p>P/L: {formatCurrency(accountSummary.longSummary.pnl)}</p>
              <p>Avg Time: {formatDuration(accountSummary.longSummary.avgTimeInPosition)}</p>
              <p>Count: {accountSummary.longSummary.count}</p>
            </div>
            <Separator />
            <div>
              <h3 className="text-lg font-semibold mb-2">Short Trades</h3>
              <p>P/L: {formatCurrency(accountSummary.shortSummary.pnl)}</p>
              <p>Avg Time: {formatDuration(accountSummary.shortSummary.avgTimeInPosition)}</p>
              <p>Count: {accountSummary.shortSummary.count}</p>
            </div>
          </div>
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>P/L Chart</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      accessibilityLayer
                      data={accountSummary.chartData}
                      margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
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
                        {accountSummary.chartData.map((entry: any, index: number) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.pnl >= 0 ? positiveColor : negativeColor}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Daily Trades P/L (All Accounts)</CardTitle>
          <CardDescription>Overview of all trades across accounts</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px]">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                accessibilityLayer
                data={allTradesChartData}
                margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
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
                  {allTradesChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.pnl >= 0 ? positiveColor : negativeColor}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
      {accountSummaries.map(renderAccountCard)}

    </div>
  )
}