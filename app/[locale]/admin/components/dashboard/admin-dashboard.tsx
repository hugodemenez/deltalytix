'use client'

import { Card } from "@/components/ui/card"
import { ResponsiveContainer, BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area } from 'recharts'
import { useEffect, useState } from 'react'
import { getUserStats, getTradeStats } from '../../actions/stats'
import { Badge } from "@/components/ui/badge"
import { UserGrowthChart } from './user-growth-chart'
import { TradesUsersChart } from './trades-users-chart'
import { Button } from "@/components/ui/button"
import { FreeUsersTable } from './free-users-table'

interface TradeData {
  date: string
  trades: number
}

interface DailyUserData {
  date: string
  users: number
}

interface User {
  id: string
  email: string
  created_at: string
}

function valueFormatter(number: number) {
  return `${Intl.NumberFormat('us').format(number).toString()}`
}

export function AdminDashboard() {
  const [userStats, setUserStats] = useState<{ 
    totalUsers: number
    dailyData: DailyUserData[]
    allUsers: User[]
  }>({ totalUsers: 0, dailyData: [], allUsers: [] })
  const [tradeStats, setTradeStats] = useState<{
    totalTrades: number
    dailyData: TradeData[]
  }>({ totalTrades: 0, dailyData: [] })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [userData, tradeData] = await Promise.all([
          getUserStats(),
          getTradeStats()
        ])
        setUserStats({
          totalUsers: userData.totalUsers,
          dailyData: userData.dailyData.map(item => ({
            date: item.date,
            users: Number(item.users)
          })),
          allUsers: userData.allUsers
        })
        setTradeStats({
          totalTrades: tradeData.totalTrades,
          dailyData: tradeData.dailyData.map(item => ({
            date: item.date,
            trades: item.trades
          }))
        })
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
          <div className="h-80 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  // Calculate month-over-month growth for trades
  const currentMonthTrades = tradeStats.dailyData[tradeStats.dailyData.length - 1]?.trades || 0
  const previousMonthTrades = tradeStats.dailyData[tradeStats.dailyData.length - 2]?.trades || 0
  const monthlyTradeGrowth = previousMonthTrades ? ((currentMonthTrades - previousMonthTrades) / previousMonthTrades) * 100 : 0

  // Combine user and trade data for the comparison chart
  const combinedDailyData = userStats.dailyData.map(userDay => {
    const tradeDay = tradeStats.dailyData.find(t => t.date === userDay.date)
    return {
      date: userDay.date,
      users: userDay.users,
      trades: tradeDay?.trades || 0
    }
  })

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Total Users</h3>
            <Badge variant="secondary">Active</Badge>
          </div>
          <div className="text-3xl font-bold">{valueFormatter(userStats.totalUsers)}</div>
        </Card>

        <Card className="p-6 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Total Trades</h3>
            <Badge variant="secondary">Live</Badge>
          </div>
          <div className="text-3xl font-bold">{valueFormatter(tradeStats.totalTrades)}</div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Monthly Growth</span>
            <span className={monthlyTradeGrowth >= 0 ? "text-green-600" : "text-red-600"}>
              {monthlyTradeGrowth >= 0 ? "+" : ""}{monthlyTradeGrowth.toFixed(1)}%
            </span>
          </div>
        </Card>

        <Card className="p-6 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Average Trades per User</h3>
            <Badge variant="secondary">Analytics</Badge>
          </div>
          <div className="text-3xl font-bold">
            {valueFormatter(Math.round(tradeStats.totalTrades / (userStats.totalUsers || 1)))}
          </div>
        </Card>
      </div>

      <UserGrowthChart 
        dailyData={userStats.dailyData}
        allUsers={userStats.allUsers}
      />

      <TradesUsersChart 
        dailyData={combinedDailyData}
      />

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Free Users</h3>
          <Badge variant="secondary">Active</Badge>
        </div>
        <FreeUsersTable />
      </Card>
    </div>
  )
} 