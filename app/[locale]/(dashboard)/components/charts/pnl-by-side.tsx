'use client'

import * as React from "react"
import { useFormattedTrades } from '@/components/context/trades-data'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Cell, TooltipProps, ReferenceLine, ResponsiveContainer } from 'recharts'
import { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent"
import { ChartContainer, ChartConfig } from "@/components/ui/chart"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface PnLBySideChartProps {
  size?: 'small' | 'medium' | 'large' | 'small-long'
}

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

export default function PnLBySideChart({ size = 'medium' }: PnLBySideChartProps) {
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
    return (size === 'small' || size === 'small-long')
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
            PnL by Side
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Switch
              id="pnl-toggle"
              checked={showTotal}
              onCheckedChange={setShowTotal}
              className={cn(
                (size === 'small' || size === 'small-long') ? "h-3 w-7" : "h-5 w-10",
                (size === 'small' || size === 'small-long') ? "[&>span]:h-2 [&>span]:w-2" : "[&>span]:h-4 [&>span]:w-4"
              )}
            />
            <Label 
              htmlFor="pnl-toggle" 
              className={cn(
                "text-muted-foreground",
                (size === 'small' || size === 'small-long') ? "text-[10px]" : "text-sm"
              )}
            >
              {showTotal ? 'Total' : 'Avg'}
            </Label>
          </div>
        </div>
        <CardDescription 
          className={cn(
            (size === 'small' || size === 'small-long') ? "hidden" : "text-xs sm:text-sm"
          )}
        >
          Showing {showTotal ? 'total' : 'average'} PnL for each trading side
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
                strokeDasharray="3 3" 
                opacity={(size === 'small' || size === 'small-long') ? 0.5 : 1}
              />
              <XAxis
                dataKey="side"
                tickLine={false}
                axisLine={false}
                tickMargin={(size === 'small' || size === 'small-long') ? 4 : 8}
                tick={{ fontSize: (size === 'small' || size === 'small-long') ? 10 : 12 }}
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
                domain={[Math.min(minPnL, 0), Math.max(maxPnL, 0)]}
                tickFormatter={(value: number) => `$${value.toFixed(2)}`}
                label={(size === 'small' || size === 'small-long') ? undefined : { 
                  value: "P/L", 
                  angle: -90, 
                  position: 'insideLeft',
                  fontSize: 12
                }}
              />
              <ReferenceLine y={0} stroke="hsl(var(--border))" />
              <Tooltip 
                content={<CustomTooltip />}
                wrapperStyle={{ 
                  fontSize: (size === 'small' || size === 'small-long') ? '10px' : '12px'
                }} 
              />
              <Bar
                dataKey={dataKey}
                name={showTotal ? 'Total PnL' : 'Average PnL'}
                radius={[4, 4, 0, 0]}
                maxBarSize={(size === 'small' || size === 'small-long') ? 30 : 50}
                className="transition-all duration-300 ease-in-out"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getColor(entry.side)} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}