'use client'

import * as React from "react"
import { useFormattedTrades } from '@/components/context/trades-data'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Text } from 'recharts'
import { ChartContainer, ChartConfig } from "@/components/ui/chart"
import { cn } from "@/lib/utils"

interface ChartData {
  name: string
  value: number
  color: string
}

interface CommissionsPnLChartProps {
  size?: 'small' | 'medium' | 'large' | 'small-long'
}

const chartConfig = {
  pnl: {
    label: "PnL Breakdown",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value, fontSize }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 20) * cos;
  const my = cy + (outerRadius + 20) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={fontSize}
      >
        {`${(percent * 100).toFixed(1)}%`}
      </text>
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={value.color} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={value.color} stroke="none" />
      <text 
        x={ex + (cos >= 0 ? 1 : -1) * 12} 
        y={ey} 
        textAnchor={textAnchor} 
        className="fill-black dark:fill-white"
        fontSize={fontSize}
      >
        {name}
      </text>
    </g>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background p-2 border rounded shadow-sm">
        <p className="font-semibold">{data.name}</p>
        <p className="text-sm">{`$${data.value.toFixed(2)}`}</p>
      </div>
    );
  }
  return null;
};

export default function CommissionsPnLChart({ size = 'medium' }: CommissionsPnLChartProps) {
  const { formattedTrades } = useFormattedTrades()

  const chartData: ChartData[] = React.useMemo(() => {
    const totalPnL = formattedTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    const totalCommissions = formattedTrades.reduce((sum, trade) => sum + trade.commission, 0);
    const netPnL = totalPnL - totalCommissions;
    const grossPnL = Math.abs(netPnL) + totalCommissions;

    return [
      { name: 'Net PnL', value: Math.abs(netPnL), color: 'hsl(var(--chart-2))' },
      { name: 'Commissions', value: totalCommissions, color: 'hsl(var(--chart-1))' },
    ];
  }, [formattedTrades])

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

  const getOuterRadius = () => {
    switch (size) {
      case 'small':
      case 'small-long':
        return 45
      case 'medium':
        return 100
      case 'large':
        return 120
      default:
        return 100
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
            PnL Breakdown
          </CardTitle>
        </div>
        <CardDescription 
          className={cn(
            (size === 'small' || size === 'small-long') ? "hidden" : "text-xs sm:text-sm"
          )}
        >
          Showing net PnL and commissions as a proportion of gross PnL
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
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={!(size === 'small' || size === 'small-long')}
                label={(props) => renderCustomizedLabel({ 
                  ...props, 
                  fontSize: (size === 'small' || size === 'small-long') ? 10 : 12 
                })}
                outerRadius={getOuterRadius()}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                content={<CustomTooltip />}
                wrapperStyle={{ 
                  fontSize: (size === 'small' || size === 'small-long') ? '10px' : '12px'
                }} 
              />
              {!(size === 'small' || size === 'small-long') && <Legend />}
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}