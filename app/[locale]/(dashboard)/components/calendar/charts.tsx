"use client"

import React from 'react'
import { BarChart, Bar, Cell, Tooltip, ResponsiveContainer, Legend, XAxis, YAxis } from "recharts"
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
import { saveMood, getMoodForDay } from '@/server/mood'
import { useUser } from '@/components/context/user-data'
import { useToast } from '@/hooks/use-toast'
import { useI18n } from '@/locales/client'

interface ChartsProps {
  dayData: CalendarEntry | undefined;
}

const chartConfig = {
  pnl: {
    label: "P&L Distribution",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

const formatCurrency = (value: number | undefined | null) => {
  if (value == null) return '$0.00'
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  
  if (hours > 0) return `${hours}h ${minutes}m ${remainingSeconds}s`
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`
  return `${remainingSeconds}s`
}

export function Charts({ dayData }: ChartsProps) {
  const { effectiveTheme } = useTheme()
  const isDarkMode = effectiveTheme === 'dark'
  const { user } = useUser()
  const { toast } = useToast()
  const t = useI18n()
  const [isLoading, setIsLoading] = React.useState<'bad' | 'okay' | 'great' | null>(null)
  const [selectedMood, setSelectedMood] = React.useState<'bad' | 'okay' | 'great' | null>(null)

  const STORAGE_KEY = 'daily_mood'

  // Load mood from localStorage or fetch from server on mount
  React.useEffect(() => {
    const loadMood = async () => {
      if (!user?.id || !dayData?.trades?.[0]?.entryDate) return

      // Check localStorage first
      const focusedDay = new Date(dayData.trades[0].entryDate).toISOString().split('T')[0]
      const storedMoodData = localStorage.getItem(STORAGE_KEY)
      
      if (storedMoodData) {
        const storedMood = JSON.parse(storedMoodData)
        if (storedMood.date === focusedDay) {
          setSelectedMood(storedMood.mood)
          return
        }
      }

      // If no valid localStorage data, fetch from server
      try {
        const mood = await getMoodForDay(user.id, new Date(dayData.trades[0].entryDate))
        if (mood) {
          setSelectedMood(mood.mood as 'bad' | 'okay' | 'great')
          // Update localStorage
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            mood: mood.mood,
            date: focusedDay
          }))
        }
      } catch (error) {
        console.error('Error loading mood:', error)
      }
    }

    loadMood()
  }, [user?.id, dayData?.trades])

  const handleMoodSelect = async (mood: 'bad' | 'okay' | 'great') => {
    if (!user?.id || !dayData?.trades?.[0]?.entryDate) {
      toast({
        title: t('error'),
        description: t('auth.required'),
        variant: "destructive",
      })
      return
    }

    setIsLoading(mood)
    try {
      const date = new Date(dayData.trades[0].entryDate)
      // Set the time to noon to avoid timezone issues
      date.setHours(12, 0, 0, 0)
      await saveMood(user.id, mood, undefined, date)
      setSelectedMood(mood)
      
      // Save to localStorage
      const focusedDay = date.toISOString().split('T')[0]
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        mood,
        date: focusedDay
      }))

      toast({
        title: t('success'),
        description: t('mood.saved'),
      })
    } catch (error) {
      console.error('Error saving mood:', error)
      toast({
        title: t('error'),
        description: t('mood.error'),
        variant: "destructive",
      })
    } finally {
      setIsLoading(null)
    }
  }

  const getMoodButtonStyle = (moodType: 'bad' | 'okay' | 'great') => {
    const baseStyle = "flex flex-col items-center h-auto py-2 px-4"
    const hoverStyle = moodType === 'bad' ? 'hover:text-red-500' : 
                      moodType === 'okay' ? 'hover:text-yellow-500' : 
                      'hover:text-green-500'
    const selectedStyle = selectedMood === moodType ? 
                         (moodType === 'bad' ? 'text-red-500' : 
                          moodType === 'okay' ? 'text-yellow-500' : 
                          'text-green-500') : ''
    
    return `${baseStyle} ${hoverStyle} ${selectedStyle}`
  }

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
      const percentage = data.account !== 'total' 
        ? ((data.value / totalPnL) * 100).toFixed(1)
        : '100'
      return (
        <div className="bg-background p-2 border rounded shadow-sm">
          <p className="font-semibold">{data.name}</p>
          <p className={`font-bold ${data.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(data.value)}
          </p>
          {data.account !== 'total' && (
            <p className="text-sm text-muted-foreground">
              {percentage}% of total
            </p>
          )}
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
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 40, left: 40, bottom: 5 }}
                layout="vertical"
              >
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  hide 
                />
                <XAxis 
                  type="number"
                  tickFormatter={(value) => formatCurrency(value)}
                  domain={['auto', 'auto']}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="value" 
                  barSize={20}
                  name={'Account P&L'}
                  label={{
                    position: 'right',
                    formatter: (value: number) => formatCurrency(value)
                  }}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={colors[index % colors.length]}
                      className="transition-all duration-300 ease-in-out hover:opacity-80"
                    />
                  ))}
                </Bar>
              </BarChart>
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
                className={getMoodButtonStyle('bad')}
                onClick={() => handleMoodSelect('bad')}
                disabled={isLoading !== null}
              >
                <FaRegSadTear className={`h-6 w-6 ${isLoading === 'bad' ? 'animate-pulse' : ''}`} />
              </Button>
              
              <Button
                variant="ghost"
                size="lg"
                className={getMoodButtonStyle('okay')}
                onClick={() => handleMoodSelect('okay')}
                disabled={isLoading !== null}
              >
                <FaRegMeh className={`h-6 w-6 ${isLoading === 'okay' ? 'animate-pulse' : ''}`} />
              </Button>
              
              <Button
                variant="ghost"
                size="lg"
                className={getMoodButtonStyle('great')}
                onClick={() => handleMoodSelect('great')}
                disabled={isLoading !== null}
              >
                <FaRegSmileBeam className={`h-6 w-6 ${isLoading === 'great' ? 'animate-pulse' : ''}`} />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}