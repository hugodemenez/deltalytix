'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { format } from 'date-fns'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { aggregateCombinedDataByPeriod } from '@/app/[locale]/admin/lib/utils'

interface DailyData {
  date: string
  users: number
  trades: number
}

interface TradesUsersChartProps {
  dailyData: DailyData[]
}

function valueFormatter(number: number) {
  return `${Intl.NumberFormat('us').format(number).toString()}`
}

export function TradesUsersChart({ dailyData }: TradesUsersChartProps) {
  const [timePeriod, setTimePeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily')

  // Aggregate data based on selected time period
  const aggregatedData = aggregateCombinedDataByPeriod(dailyData, timePeriod)

  // Transform data for the chart
  const chartData = aggregatedData.map(item => ({
    date: formatDate(item.date),
    Users: item.users,
    Trades: item.trades
  }))

  function formatDate(date: string) {
    const d = new Date(date)
    switch (timePeriod) {
      case 'weekly':
        return `Week of ${format(d, 'MMM d, yyyy')}`
      case 'monthly':
        return format(d, 'MMMM yyyy')
      case 'yearly':
        return format(d, 'yyyy')
      default:
        return format(d, 'MMM d, yyyy')
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Trading Activity Overview</CardTitle>
        <Select value={timePeriod} onValueChange={(value: 'daily' | 'weekly' | 'monthly' | 'yearly') => setTimePeriod(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                className="text-sm"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                className="text-sm"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                width={48}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-background p-4 shadow-sm">
                        <div className="grid gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">{payload[0].payload.date}</span>
                          </div>
                          <div className="flex items-center justify-between gap-x-2">
                            <span className="text-sm font-medium">Trades</span>
                            <span className="text-sm font-bold">{valueFormatter(payload[1].value as number)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar
                dataKey="Users"
                fill="hsl(var(--chart-1))"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="Trades"
                fill="hsl(var(--chart-2))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
} 