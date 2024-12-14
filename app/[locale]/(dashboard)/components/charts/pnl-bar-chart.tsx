"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer } from "@/components/ui/chart"
import { useCalendarData } from "../../../../../components/context/trades-data"
import { cn } from "@/lib/utils"

interface PNLChartProps {
  size?: 'small' | 'medium' | 'large' | 'small-long'
}

const chartConfig = {
  pnl: {
    label: "Daily P/L",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

const formatCurrency = (value: number) =>
  `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const positiveColor = "hsl(var(--chart-2))" // Green color
const negativeColor = "hsl(var(--chart-1))" // Orangish color

export default function PNLChart({ size = 'medium' }: PNLChartProps) {
  const { calendarData } = useCalendarData()
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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background p-2 border rounded shadow-sm">
          <p className="font-semibold">{new Date(label).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
          <p className={`font-bold ${data.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            P/L: {formatCurrency(data.pnl)}
          </p>
          <p>Long Trades: {data.longNumber}</p>
          <p>Short Trades: {data.shortNumber}</p>
        </div>
      );
    }
    return null;
  };

  const getChartHeight = () => {
    switch (size) {
      case 'small':
      case 'small-long':
        return 'h-[140px]'
      case 'medium':
        return 'h-[240px]'
      case 'large':
        return 'h-[280px]'
      default:
        return 'h-[240px]'
    }
  }

  const getYAxisWidth = () => {
    const maxLength = Math.max(
      Math.abs(minPnL).toFixed(2).length,
      Math.abs(maxPnL).toFixed(2).length
    );
    return size === 'small' 
      ? Math.max(35, 8 * (maxLength + 1))
      : Math.max(45, 10 * (maxLength + 1));
  }

  return (
    <Card className="h-full">
      <CardHeader 
        className={cn(
          "flex flex-col items-stretch space-y-0 border-b",
          (size === 'small' || size === 'small-long')
            ? "p-2" 
            : "p-4 sm:p-6"
        )}
      >
        <div className="flex items-center justify-between">
          <CardTitle 
            className={cn(
              "line-clamp-1",
              (size === 'small' || size === 'small-long') ? "text-sm" : "text-base sm:text-lg"
            )}
          >
            Daily Profit/Loss
          </CardTitle>
        </div>
        <CardDescription 
          className={cn(
            (size === 'small' || size === 'small-long') ? "hidden" : "text-xs sm:text-sm"
          )}
        >
          Showing daily P/L over time
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
            <BarChart
              data={chartData}
              margin={
                (size === 'small' || size === 'small-long')
                  ? { left: 10, right: 4, top: 4, bottom: 0 }
                  : { left: 16, right: 8, top: 8, bottom: 0 }
              }
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                opacity={(size === 'small' || size === 'small-long') ? 0.5 : 1}
              />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={(size === 'small' || size === 'small-long') ? 4 : 8}
                tick={{ fontSize: (size === 'small' || size === 'small-long') ? 10 : 12 }}
                minTickGap={(size === 'small' || size === 'small-long') ? 16 : 32}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={(size === 'small' || size === 'small-long') ? 4 : 8}
                tick={{ 
                  fontSize: (size === 'small' || size === 'small-long') ? 10 : 12,
                  fill: 'currentColor'
                }}
                width={getYAxisWidth()}
                tickFormatter={formatCurrency}
                label={(size === 'small' || size === 'small-long') ? undefined : { 
                  value: "P/L", 
                  angle: -90, 
                  position: 'insideLeft',
                  fontSize: 12
                }}
              />
              <Tooltip 
                content={<CustomTooltip />}
                wrapperStyle={{ 
                  fontSize: (size === 'small' || size === 'small-long') ? '10px' : '12px'
                }} 
              />
              <Bar
                dataKey="pnl"
                radius={[4, 4, 0, 0]}
                maxBarSize={(size === 'small' || size === 'small-long') ? 30 : 50}
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