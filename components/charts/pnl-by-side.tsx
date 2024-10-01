'use client'

import * as React from "react"
import { useFormattedTrades } from '@/components/context/trades-data'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Cell, TooltipProps, ReferenceLine } from 'recharts'
import { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent"
import { ChartContainer, ChartConfig } from "@/components/ui/chart"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

interface ChartData {
  side: string
  totalPnl: number
  avgPnl: number
}

const chartConfig = {
  pnl: {
    label: "PnL",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background p-2 border rounded shadow-sm">
        <p className="font-semibold">{`${label}`}</p>
        <p className="text-sm">{`${payload[0].name}: $${Number(payload[0].value).toFixed(2)}`}</p>
      </div>
    );
  }
  return null;
};

const getColor = (side: string) => {
  const baseColorVar = side.toLowerCase() === 'short' ? '--chart-1' : '--chart-2';
  return `hsl(var(${baseColorVar}))`;
};

export default function PnLBySideChart() {
  const { formattedTrades } = useFormattedTrades()
  const [showTotal, setShowTotal] = React.useState(true)

  const chartData: ChartData[] = React.useMemo(() => {
    const pnlBySide = formattedTrades.reduce((acc, trade) => {
      const side = (trade.side || 'unknown').toLowerCase()
      if (!acc[side]) {
        acc[side] = { totalPnl: 0, count: 0 }
      }
      acc[side].totalPnl += trade.pnl
      acc[side].count += 1
      return acc
    }, {} as Record<string, { totalPnl: number; count: number }>)

    return Object.entries(pnlBySide).map(([side, data]) => ({
      side: side.charAt(0).toUpperCase() + side.slice(1),
      totalPnl: Number(data.totalPnl.toFixed(2)),
      avgPnl: Number((data.totalPnl / data.count).toFixed(2)),
    }))
  }, [formattedTrades])

  const dataKey = showTotal ? 'totalPnl' : 'avgPnl'
  const maxPnL = Math.max(...chartData.map(d => d[dataKey]), 0)
  const minPnL = Math.min(...chartData.map(d => d[dataKey]), 0)

  return (
    <Card>
      <CardHeader className="sm:min-h-[120px] flex flex-col items-stretch space-y-0 border-b p-6">
        <CardTitle>PnL by Side</CardTitle>
        <CardDescription>
          Showing {showTotal ? 'total' : 'average'} PnL for each trading side
        </CardDescription>
        <div className="flex items-center space-x-2 pt-4">
          <Switch
            id="pnl-toggle"
            checked={showTotal}
            onCheckedChange={setShowTotal}
          />
          <Label htmlFor="pnl-toggle">
            {showTotal ? 'Total PnL' : 'Average PnL'}
          </Label>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[350px] w-full"
        >
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="side"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              domain={[Math.min(minPnL, 0), Math.max(maxPnL, 0)]}
              tickFormatter={(value: number) => `$${value.toFixed(2)}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="hsl(var(--border))" />
            <Bar
              dataKey={dataKey}
              name={showTotal ? 'Total PnL' : 'Average PnL'}
              radius={[4, 4, 0, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getColor(entry.side)} 
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}