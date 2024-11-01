"use client"

import React from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts"
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
import { CalendarEntry } from "@/types/calendar"
import { useTheme } from "@/components/context/theme-provider"
import { Button } from "@/components/ui/button"
import { FaRegSadTear, FaRegMeh, FaRegSmileBeam } from "react-icons/fa"

interface ChartsProps {
  dayData: CalendarEntry | undefined;
}

const chartConfig = {
  pnl: {
    label: "P&L Distribution",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

const formatCurrency = (value: number) =>
  `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export function Charts({ dayData }: ChartsProps) {
  const { effectiveTheme } = useTheme()
  const isDarkMode = effectiveTheme === 'dark'

  if (!dayData?.trades?.length) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">No trade data available for this day</p>
      </div>
    )
  }

  // Calculate final P&L for each account (including commissions)
  const accountPnL = dayData.trades.reduce((acc, trade) => {
    const accountNumber = trade.accountNumber || 'Unknown'
    // Add commission to P&L calculation
    const totalPnL = trade.pnl - (trade.commission || 0)
    acc[accountNumber] = (acc[accountNumber] || 0) + totalPnL
    return acc
  }, {} as Record<string, number>)

  // Convert to chart data format
  const chartData = Object.entries(accountPnL).map(([account, pnl]) => ({
    name: `Account ${account}`,
    value: pnl,
    account,
  }))

  // Sort by absolute value for better visualization
  chartData.sort((a, b) => Math.abs(b.value) - Math.abs(a.value))

  const totalPnL = chartData.reduce((sum, item) => sum + item.value, 0)

  // Generate colors based on theme
  const colors = isDarkMode 
    ? ['#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6']  // Dark mode colors
    : ['#a78bfa', '#818cf8', '#60a5fa', '#38bdf8', '#22d3ee', '#2dd4bf']  // Light mode colors

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload?.[0]) {
      const data = payload[0].payload
      const percentage = ((data.value / totalPnL) * 100).toFixed(1)
      return (
        <div className="bg-background p-2 border rounded shadow-sm">
          <p className="font-semibold">{data.name}</p>
          <p className={`font-bold ${data.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            P&L (after comm.): {formatCurrency(data.value)}
          </p>
          <p className="text-sm text-muted-foreground">
            {percentage}% of total
          </p>
        </div>
      )
    }
    return null
  }

  // Calculate average time in position
  const avgTimeInPosition = dayData?.trades?.length
    ? dayData.trades.reduce((sum, trade) => sum + trade.timeInPosition, 0) / dayData.trades.length
    : 0

  return (
    <div className="space-y-6">
      {/* Existing Doughnut Chart Card */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Daily P&L Distribution</CardTitle>
          <CardDescription>
            Total P&L (after commissions): {formatCurrency(totalPnL)}
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="80%"
                  paddingAngle={2}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`}
                      fill={colors[index % colors.length]}
                      className="transition-all duration-300 ease-in-out hover:opacity-80"
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="middle" 
                  align="right"
                  layout="vertical"
                  formatter={(value, entry: any) => (
                    <span className="text-sm">
                      {value}: {formatCurrency(entry.payload.value)}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Three Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Daily P&L Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Daily P&L (after comm.)</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalPnL)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Across {Object.keys(accountPnL).length} account{Object.keys(accountPnL).length > 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        {/* Average Time Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Avg Time in Position</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <p className="text-2xl font-bold">
              {formatDuration(avgTimeInPosition)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Over {dayData.trades.length} trade{dayData.trades.length > 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        {/* Mood Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">How was your day?</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex justify-around items-center">
              <Button
                variant="ghost"
                size="lg"
                className="flex flex-col items-center hover:text-red-500 h-auto py-2 px-4"
                onClick={() => {/* Handle mood selection */}}
              >
                <FaRegSadTear className="h-6 w-6 mb-1" />
                <span className="text-sm font-medium">Bad</span>
              </Button>
              
              <Button
                variant="ghost"
                size="lg"
                className="flex flex-col items-center hover:text-yellow-500 h-auto py-2 px-4"
                onClick={() => {/* Handle mood selection */}}
              >
                <FaRegMeh className="h-6 w-6 mb-1" />
                <span className="text-sm font-medium">Okay</span>
              </Button>
              
              <Button
                variant="ghost"
                size="lg"
                className="flex flex-col items-center hover:text-green-500 h-auto py-2 px-4"
                onClick={() => {/* Handle mood selection */}}
              >
                <FaRegSmileBeam className="h-6 w-6 mb-1" />
                <span className="text-sm font-medium">Great</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}