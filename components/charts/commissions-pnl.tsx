'use client'

import * as React from "react"
import { useFormattedTrades } from '@/components/context/trades-data'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Text } from 'recharts'
import { ChartContainer, ChartConfig } from "@/components/ui/chart"

interface ChartData {
  name: string
  value: number
  color: string
}

const chartConfig = {
  pnl: {
    label: "PnL Breakdown",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
        {`${(percent * 100).toFixed(1)}%`}
      </text>
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={value.color} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={value.color} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} className="fill-black dark:fill-white">{name}</text>
    </g>
  );
};

const CustomTooltip: React.FC<any> = ({ active, payload }) => {
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

export default function CommissionsPnLChart() {
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

  const totalValue = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card>
      <CardHeader className="sm:min-h-[120px] flex flex-col items-stretch space-y-0 border-b p-6">
        <CardTitle>PnL Breakdown</CardTitle>
        <CardDescription>
          Showing net PnL and commissions as a proportion of gross PnL
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[400px] w-full"
        >
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={renderCustomizedLabel}
                outerRadius={150}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}