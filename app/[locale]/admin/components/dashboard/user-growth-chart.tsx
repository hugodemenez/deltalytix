'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format, startOfWeek, startOfMonth, startOfYear } from 'date-fns'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { aggregateDataByPeriod } from '@/app/[locale]/admin/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DailyUserData {
  date: string
  users: number
}

interface User {
  id: string
  email: string
  created_at: string
}

interface UserGrowthChartProps {
  dailyData: DailyUserData[]
  allUsers: User[]
}

function valueFormatter(number: number) {
  return `${Intl.NumberFormat('us').format(number).toString()}`
}

export function UserGrowthChart({ dailyData, allUsers }: UserGrowthChartProps) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [timePeriod, setTimePeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily')
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Aggregate data based on selected time period
  const aggregatedData = aggregateDataByPeriod(dailyData, timePeriod, 'users')

  // Get users for selected period
  const selectedPeriodUsers = selectedMonth
    ? allUsers.filter(user => {
        const userDate = new Date(user.created_at)
        const selectedDate = new Date(selectedMonth)
        
        switch (timePeriod) {
          case 'weekly':
            return startOfWeek(userDate, { weekStartsOn: 1 }).getTime() === startOfWeek(selectedDate, { weekStartsOn: 1 }).getTime()
          case 'monthly':
            return startOfMonth(userDate).getTime() === startOfMonth(selectedDate).getTime()
          case 'yearly':
            return startOfYear(userDate).getTime() === startOfYear(selectedDate).getTime()
          default:
            return user.created_at.startsWith(selectedMonth)
        }
      })
    : []

  const formatDate = (date: string | null) => {
    if (!date) return ''
    const d = new Date(date)
    switch (timePeriod) {
      case 'weekly':
        return `Week of ${format(startOfWeek(d, { weekStartsOn: 1 }), 'MMM d, yyyy')}`
      case 'monthly':
        return format(d, 'MMMM yyyy')
      case 'yearly':
        return format(d, 'yyyy')
      default:
        return format(d, 'MMM d, yyyy')
    }
  }

  const handleChartClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      setSelectedMonth(data.activePayload[0].payload.date)
      setIsDialogOpen(true)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>User Growth Analysis</CardTitle>
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
              <AreaChart
                data={aggregatedData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                onClick={handleChartClick}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => formatDate(date)}
                  className="text-sm"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  yAxisId="left"
                  className="text-sm"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  width={48}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="rounded-lg border bg-background p-4 shadow-xs">
                          <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Period</span>
                              <span className="text-sm">{formatDate(data.date)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">New Users</span>
                              <span className="text-sm font-bold">{valueFormatter(data.users)}</span>
                            </div>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="users"
                  stroke="#3b82f6"
                  fill="#3b82f620"
                  strokeWidth={2}
                />
                {selectedMonth && (
                  <ReferenceLine
                    x={selectedMonth}
                    yAxisId="left"
                    stroke="#ef4444"
                    strokeWidth={2}
                    strokeDasharray="3 3"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selectedMonth ? `New Users in ${formatDate(selectedMonth)}` : 'New Users'}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedPeriodUsers.length > 0 ? (
                  selectedPeriodUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {format(new Date(user.created_at), 'MMM d, yyyy')}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      No users found for this period
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 