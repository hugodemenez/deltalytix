"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell, Tooltip } from "recharts"

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
import { useCalendarData } from "../../../../../components/context/trades-data"

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

export default function PNLChart() {
  const { calendarData } = useCalendarData()
  const chartData = Object.entries(calendarData).map(([date, values]) => ({
    date,
    pnl: values.pnl,
    shortNumber: values.shortNumber,
    longNumber: values.longNumber,
  })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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

  return (
    <Card>
      <CardHeader className="sm:min-h-[120px] flex flex-col items-stretch space-y-0 border-b p-6">
        <CardTitle>
          Daily Profit/Loss
        </CardTitle>
        <CardDescription>
          Showing daily P/L over time
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[350px] w-full"
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
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
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